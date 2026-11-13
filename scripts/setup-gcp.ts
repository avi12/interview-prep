import { readFileSync } from "node:fs";

import {
  createSiteRequest,
  getSiteRequest,
  linkSiteAppRequest,
  readCheckedFirebaseJson,
  siteSchema
} from "#scripts/lib/firebase-rest-hosting.ts";
import {
  API,
  createRestClient,
  describeRequest,
  findResource,
  HTTP_METHOD,
  HTTP_STATUS,
  isHttpStatus,
  operationSchema,
  type RequestSpec,
  type RestRequest,
  retryUntil,
  waitForOperation,
  withRequestLog
} from "#scripts/lib/firebase-rest.ts";
import { done, manual, runSteps, skipped, type Step } from "#scripts/lib/gcloud-steps.ts";
import {
  BUILD_SERVICE_ACCOUNT,
  BUILD_SERVICE_ACCOUNT_NAME,
  describeGcloud,
  GCLOUD_ACCOUNT,
  hasFlag,
  isNotFoundOutput,
  mustRunGcloud,
  printAccessToken,
  readFlag,
  readGcloudJson,
  runGcloud,
  RUNTIME_SERVICE_ACCOUNT
} from "#scripts/lib/gcloud.ts";
import { FIREBASE_AUTH_ORIGIN, GCP, WEB_ORIGIN } from "#scripts/lib/gcp.ts";
import { zod } from "#scripts/lib/zod.ts";

const isDryRun = hasFlag("dry-run");
const billingAccount = readFlag("billing-account");

const REQUIRED_APIS = [
  "run.googleapis.com",
  "artifactregistry.googleapis.com",
  "cloudbuild.googleapis.com",
  "firestore.googleapis.com",
  "firebase.googleapis.com",
  "firebasehosting.googleapis.com",
  "firebaserules.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "apikeys.googleapis.com",
  "logging.googleapis.com",
  "iam.googleapis.com",
  "iamcredentials.googleapis.com",
  "serviceusage.googleapis.com",
  "cloudresourcemanager.googleapis.com"
];

const RUNTIME_ROLES = ["roles/datastore.user", "roles/firebaseauth.viewer"];
const BUILD_PROJECT_ROLES = ["roles/logging.logWriter", "roles/storage.objectViewer"];
const BUILD_REPOSITORY_ROLES = ["roles/artifactregistry.writer"];

const FIRESTORE_RULES_RELEASE = "cloud.firestore";
const GOOGLE_PROVIDER = "google.com";
const WEB_APP_DISPLAY_NAME = GCP.runService;
const IAM_PROPAGATION_ATTEMPTS = 6;
const IAM_PROPAGATION_DELAY_MS = 10_000;
const PROJECT_TAKEN_OUTPUT = /already (in use|exists)|is not available/i;
const AUTH_DOMAINS = [new URL(WEB_ORIGIN).host, new URL(FIREBASE_AUTH_ORIGIN).host];
const AUTH_CONSOLE_URL = `https://console.firebase.google.com/project/${GCP.projectId}/authentication/providers`;
const BILLING_CONSOLE_URL = `https://console.cloud.google.com/billing/linkedaccount?project=${GCP.projectId}`;

const PROJECT_PATH = `projects/${GCP.projectId}`;
const FIREBASE_PROJECT_URL = `${API.FIREBASE}/${PROJECT_PATH}`;
const WEB_APPS_URL = `${FIREBASE_PROJECT_URL}/webApps`;
const RULES_PROJECT_URL = `${API.RULES}/${PROJECT_PATH}`;
const RULES_RELEASE_NAME = `${PROJECT_PATH}/releases/${FIRESTORE_RULES_RELEASE}`;
const AUTH_CONFIG_URL = `${API.IDENTITY_TOOLKIT}/${PROJECT_PATH}/config`;
const GOOGLE_IDP_URL = `${API.IDENTITY_TOOLKIT}/${PROJECT_PATH}/defaultSupportedIdpConfigs/${GOOGLE_PROVIDER}`;

const projectSchema = zod.object({
  projectId: zod.string(),
  lifecycleState: zod.string().optional()
});
const billingSchema = zod.object({ billingEnabled: zod.boolean().optional() });
const enabledServicesSchema = zod.array(zod.object({ config: zod.object({ name: zod.string() }) }));
const describedSchema = zod.object({ name: zod.string() });
const firestoreDatabaseSchema = zod.object({
  name: zod.string(),
  locationId: zod.string().optional()
});
const policySchema = zod.object({
  bindings: zod
    .array(
      zod.object({
        role: zod.string(),
        members: zod.array(zod.string())
      })
    )
    .optional()
});
const webAppSchema = zod.object({
  appId: zod.string(),
  displayName: zod.string().optional()
});
const webAppListSchema = zod.object({ apps: zod.array(webAppSchema).optional() });
const firebaseProjectSchema = zod.object({ projectId: zod.string() });
const rulesReleaseSchema = zod.object({
  name: zod.string(),
  rulesetName: zod.string()
});
const rulesetSchema = zod.object({
  name: zod.string(),
  source: zod
    .object({
      files: zod.array(
        zod.object({
          name: zod.string(),
          content: zod.string()
        })
      )
    })
    .optional()
});
const authConfigSchema = zod.object({ authorizedDomains: zod.array(zod.string()).optional() });
const idpConfigSchema = zod.object({
  enabled: zod.boolean().optional(),
  clientId: zod.string().optional()
});

let restRequest: RestRequest | undefined;

function rest() {
  restRequest ??= createRestClient({
    accessToken: printAccessToken(),
    quotaProject: GCP.projectId
  });
  return restRequest;
}

function send<Schema extends zod.ZodType>({ spec, schema }: { spec: RequestSpec; schema: Schema }) {
  return withRequestLog(rest())({
    ...spec,
    schema
  });
}

const CREATE_PROJECT_ARGS = ["projects", "create", GCP.projectId, `--name=${GCP.projectId}`];

const projectStep: Step = {
  label: `project ${GCP.projectId}`,
  plan: () => [describeGcloud(["projects", "describe", GCP.projectId]), describeGcloud(CREATE_PROJECT_ARGS)],
  async run() {
    const project = readGcloudJson({
      args: ["projects", "describe", GCP.projectId],
      schema: projectSchema
    });
    if (project?.lifecycleState === "ACTIVE") {
      return skipped("exists and is active");
    }

    if (project) {
      throw new Error(
        `The project is in state ${project.lifecycleState}. Restore it with: gcloud projects undelete ${GCP.projectId}`
      );
    }

    console.log(`  $ ${describeGcloud(CREATE_PROJECT_ARGS)}`);
    const result = runGcloud({ args: CREATE_PROJECT_ARGS });
    if (result.isSuccess) {
      return done("created");
    }

    if (PROJECT_TAKEN_OUTPUT.test(result.stderr)) {
      throw new Error(
        `The project id "${GCP.projectId}" belongs to someone else. Pick a new one in GCP.projectId (scripts/lib/gcp.ts) and rerun.\n${result.stderr.trim()}`
      );
    }

    throw new Error(result.stderr.trim());
  }
};

function linkBillingArgs(account: string) {
  return ["billing", "projects", "link", GCP.projectId, `--billing-account=${account}`];
}

const billingStep: Step = {
  label: "billing",
  plan: () => [
    describeGcloud(["billing", "projects", "describe", GCP.projectId]),
    billingAccount
      ? describeGcloud(linkBillingArgs(billingAccount))
      : "(no --billing-account given: only checks that billing is enabled)"
  ],
  async run() {
    const billing = readGcloudJson({
      args: ["billing", "projects", "describe", GCP.projectId],
      schema: billingSchema
    });
    if (billing?.billingEnabled) {
      return skipped("already enabled");
    }

    if (!billingAccount) {
      throw new Error(
        `Billing is off. Cloud Run, Cloud Build and Artifact Registry need it. Find your account id with "gcloud billing accounts list --account=${GCLOUD_ACCOUNT}" and rerun with --billing-account=<id>, or link it at ${BILLING_CONSOLE_URL}`
      );
    }

    mustRunGcloud({ args: linkBillingArgs(billingAccount) });
    return done(`linked to ${billingAccount}`);
  }
};

const apisStep: Step = {
  label: "enable APIs",
  plan: () => [
    describeGcloud(["services", "list", "--enabled"]),
    describeGcloud(["services", "enable", ...REQUIRED_APIS])
  ],
  async run() {
    const enabled =
      readGcloudJson({
        args: ["services", "list", "--enabled"],
        schema: enabledServicesSchema
      }) ?? [];
    const enabledNames = new Set(enabled.map(service => service.config.name));
    const missing = REQUIRED_APIS.filter(api => !enabledNames.has(api));
    if (missing.length === 0) {
      return skipped("all enabled");
    }

    mustRunGcloud({ args: ["services", "enable", ...missing] });
    return done(`enabled ${missing.join(", ")}`);
  }
};

const addFirebaseRequest: RequestSpec = {
  method: HTTP_METHOD.POST,
  url: `${FIREBASE_PROJECT_URL}:addFirebase`,
  body: {}
};

async function isFirebaseProject() {
  try {
    await rest()({
      method: HTTP_METHOD.GET,
      url: FIREBASE_PROJECT_URL,
      schema: firebaseProjectSchema
    });
    return true;
  } catch (error) {
    if (
      isHttpStatus({
        error,
        statuses: [HTTP_STATUS.FORBIDDEN, HTTP_STATUS.NOT_FOUND]
      })
    ) {
      return false;
    }

    throw error;
  }
}

const firebaseStep: Step = {
  label: "add Firebase",
  plan: () => [
    `GET ${FIREBASE_PROJECT_URL}`,
    describeRequest(addFirebaseRequest),
    "  then poll the operation until done"
  ],
  async run() {
    if (await isFirebaseProject()) {
      return skipped("already a Firebase project");
    }

    try {
      const operation = await send({
        spec: addFirebaseRequest,
        schema: operationSchema
      });
      await waitForOperation({
        request: rest(),
        apiRoot: API.FIREBASE,
        operation
      });
    } catch (error) {
      if (
        isHttpStatus({
          error,
          statuses: [HTTP_STATUS.CONFLICT]
        })
      ) {
        return skipped("already a Firebase project");
      }

      throw error;
    }

    return done("Firebase added");
  }
};

function findSite() {
  return findResource({
    request: rest(),
    url: getSiteRequest().url,
    schema: siteSchema
  });
}

const siteStep: Step = {
  label: `Hosting site ${GCP.hostingSiteId}`,
  plan: () => [describeRequest(getSiteRequest()), describeRequest(createSiteRequest())],
  async run() {
    if (await findSite()) {
      return skipped("exists");
    }

    try {
      await send({
        spec: createSiteRequest(),
        schema: siteSchema
      });
      return done(`created ${WEB_ORIGIN}`);
    } catch (error) {
      if (await findSite()) {
        return skipped("exists");
      }

      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `The site id "${GCP.hostingSiteId}" is taken by another project. Pick a new one in GCP.hostingSiteId (scripts/lib/gcp.ts) and rerun.\n  ${reason}`
      );
    }
  }
};

const createWebAppRequest: RequestSpec = {
  method: HTTP_METHOD.POST,
  url: WEB_APPS_URL,
  body: {
    displayName: WEB_APP_DISPLAY_NAME
  }
};

async function listWebApps() {
  const list = await rest()({
    method: HTTP_METHOD.GET,
    url: WEB_APPS_URL,
    schema: webAppListSchema
  });
  return list.apps ?? [];
}

const webAppStep: Step = {
  label: "Firebase web app",
  plan: () => [`GET ${WEB_APPS_URL}`, describeRequest(createWebAppRequest), "  then poll the operation until done"],
  async run() {
    const [existing] = await listWebApps();
    if (existing) {
      return skipped(`exists (${existing.appId})`);
    }

    const operation = await send({
      spec: createWebAppRequest,
      schema: operationSchema
    });
    const finished = await waitForOperation({
      request: rest(),
      apiRoot: API.FIREBASE,
      operation
    });
    const app = webAppSchema.safeParse(finished.response);
    return done(app.success ? `created ${app.data.appId}` : "created");
  }
};

const linkSiteStep: Step = {
  label: "link the web app to the Hosting site",
  plan: () => [`GET ${WEB_APPS_URL}`, describeRequest(linkSiteAppRequest("<appId>"))],
  async run() {
    const [app] = await listWebApps();
    if (!app) {
      throw new Error("No Firebase web app exists. The previous step should have created one");
    }

    const site = await findSite();
    if (site?.appId === app.appId) {
      return skipped(`already linked to ${app.appId}`);
    }

    await send({
      spec: linkSiteAppRequest(app.appId),
      schema: siteSchema
    });
    return done(`linked to ${app.appId}, so /__/firebase/init.json serves its config`);
  }
};

const CREATE_FIRESTORE_ARGS = [
  "firestore",
  "databases",
  "create",
  `--location=${GCP.firestoreLocation}`,
  "--type=firestore-native"
];
const DESCRIBE_FIRESTORE_ARGS = ["firestore", "databases", "describe", "--database=(default)"];

const firestoreStep: Step = {
  label: `Firestore database (native, ${GCP.firestoreLocation})`,
  plan: () => [describeGcloud(DESCRIBE_FIRESTORE_ARGS), describeGcloud(CREATE_FIRESTORE_ARGS)],
  async run() {
    const database = readGcloudJson({
      args: DESCRIBE_FIRESTORE_ARGS,
      schema: firestoreDatabaseSchema
    });
    const isWrongLocation = database && database.locationId !== GCP.firestoreLocation;
    if (isWrongLocation) {
      return skipped(
        `exists in ${database.locationId}, not ${GCP.firestoreLocation}. A database cannot move, so the existing one stays`
      );
    }

    if (database) {
      return skipped("exists");
    }

    mustRunGcloud({ args: CREATE_FIRESTORE_ARGS });
    return done("created");
  }
};

const REPOSITORY_LOCATION_ARG = `--location=${GCP.region}`;
const DESCRIBE_REPOSITORY_ARGS = [
  "artifacts",
  "repositories",
  "describe",
  GCP.artifactRepository,
  REPOSITORY_LOCATION_ARG
];
const CREATE_REPOSITORY_ARGS = [
  "artifacts",
  "repositories",
  "create",
  GCP.artifactRepository,
  REPOSITORY_LOCATION_ARG,
  "--repository-format=docker",
  "--description=Images of the web trainer"
];

const repositoryStep: Step = {
  label: `Artifact Registry repo ${GCP.artifactRepository}`,
  plan: () => [describeGcloud(DESCRIBE_REPOSITORY_ARGS), describeGcloud(CREATE_REPOSITORY_ARGS)],
  async run() {
    if (
      readGcloudJson({
        args: DESCRIBE_REPOSITORY_ARGS,
        schema: describedSchema
      })
    ) {
      return skipped("exists");
    }

    mustRunGcloud({ args: CREATE_REPOSITORY_ARGS });
    return done("created");
  }
};

function serviceAccountStep({ name, email, displayName }: { name: string; email: string; displayName: string }) {
  const describeArgs = ["iam", "service-accounts", "describe", email];
  const createArgs = ["iam", "service-accounts", "create", name, `--display-name=${displayName}`];
  return {
    label: `service account ${email}`,
    plan: () => [describeGcloud(describeArgs), describeGcloud(createArgs)],
    async run() {
      if (
        readGcloudJson({
          args: describeArgs,
          schema: zod.object({ email: zod.string() })
        })
      ) {
        return skipped("exists");
      }

      mustRunGcloud({ args: createArgs });
      return done("created");
    }
  };
}

function hasBinding({
  policy,
  role,
  member
}: {
  policy: zod.infer<typeof policySchema>;
  role: string;
  member: string;
}) {
  return (policy.bindings ?? []).some(binding => binding.role === role && binding.members.includes(member));
}

async function addBindingWithRetry(args: string[]) {
  console.log(`  $ ${describeGcloud(args)}`);
  let lastError = "";
  const isBound = await retryUntil({
    attempts: IAM_PROPAGATION_ATTEMPTS,
    delayMs: IAM_PROPAGATION_DELAY_MS,
    async attempt() {
      const result = runGcloud({ args });
      lastError = result.stderr.trim();

      if (result.isSuccess) {
        return true;
      }

      if (!isNotFoundOutput(result.stderr)) {
        throw new Error(lastError);
      }

      return undefined;
    }
  });
  if (!isBound) {
    throw new Error(
      `The binding did not apply after ${IAM_PROPAGATION_ATTEMPTS} tries (a new service account can take a minute to appear): ${lastError}`
    );
  }
}

function rolesStep({
  label,
  command,
  resource,
  bindFlags,
  member,
  roles
}: {
  label: string;
  command: string[];
  resource: string[];
  bindFlags: string[];
  member: string;
  roles: string[];
}) {
  const policyArgs = [...command, "get-iam-policy", ...resource];
  function bindArgs(role: string) {
    return [
      ...command,
      "add-iam-policy-binding",
      ...resource,
      `--member=${member}`,
      `--role=${role}`,
      ...bindFlags,
      "--format=none"
    ];
  }

  return {
    label,
    plan: () => [describeGcloud(policyArgs), ...roles.map(role => describeGcloud(bindArgs(role)))],
    async run() {
      const policy =
        readGcloudJson({
          args: policyArgs,
          schema: policySchema
        }) ?? {};
      const missing = roles.filter(
        role =>
          !hasBinding({
            policy,
            role,
            member
          })
      );
      if (missing.length === 0) {
        return skipped(`already has ${roles.join(", ")}`);
      }

      for (const role of missing) {
        await addBindingWithRetry(bindArgs(role));
      }

      return done(`granted ${missing.join(", ")}`);
    }
  };
}

const PROJECT_IAM = {
  command: ["projects"],
  resource: [GCP.projectId],
  bindFlags: ["--condition=None"]
};
const REPOSITORY_IAM = {
  command: ["artifacts", "repositories"],
  resource: [GCP.artifactRepository, REPOSITORY_LOCATION_ARG],
  bindFlags: []
};

const runtimeAccountStep = serviceAccountStep({
  name: GCP.runtimeServiceAccountName,
  email: RUNTIME_SERVICE_ACCOUNT,
  displayName: "Web trainer runtime (Cloud Run)"
});

const runtimeRolesStep = rolesStep({
  label: "runtime service account roles",
  ...PROJECT_IAM,
  member: `serviceAccount:${RUNTIME_SERVICE_ACCOUNT}`,
  roles: RUNTIME_ROLES
});

const buildAccountStep = serviceAccountStep({
  name: BUILD_SERVICE_ACCOUNT_NAME,
  email: BUILD_SERVICE_ACCOUNT,
  displayName: "Web trainer image builds (Cloud Build)"
});

const buildProjectRolesStep = rolesStep({
  label: "build service account project roles",
  ...PROJECT_IAM,
  member: `serviceAccount:${BUILD_SERVICE_ACCOUNT}`,
  roles: BUILD_PROJECT_ROLES
});

const buildRepositoryRolesStep = rolesStep({
  label: "build service account repo roles",
  ...REPOSITORY_IAM,
  member: `serviceAccount:${BUILD_SERVICE_ACCOUNT}`,
  roles: BUILD_REPOSITORY_ROLES
});

function readRulesSource() {
  const { config, rulesFile } = readCheckedFirebaseJson();
  return {
    name: config.firestore.rules,
    content: readFileSync(rulesFile, "utf8")
  };
}

function createRulesetRequest(file: { name: string; content: string }) {
  return {
    method: HTTP_METHOD.POST,
    url: `${RULES_PROJECT_URL}/rulesets`,
    body: {
      source: {
        files: [file]
      }
    }
  };
}

function upsertReleaseRequest({ rulesetName, isExisting }: { rulesetName: string; isExisting: boolean }) {
  const release = {
    name: RULES_RELEASE_NAME,
    rulesetName
  };
  if (isExisting) {
    return {
      method: HTTP_METHOD.PATCH,
      url: `${API.RULES}/${RULES_RELEASE_NAME}`,
      body: {
        release
      }
    };
  }

  return {
    method: HTTP_METHOD.POST,
    url: `${RULES_PROJECT_URL}/releases`,
    body: release
  };
}

async function readReleasedRules() {
  const release = await findResource({
    request: rest(),
    url: `${API.RULES}/${RULES_RELEASE_NAME}`,
    schema: rulesReleaseSchema
  });
  if (!release) {
    return null;
  }

  const ruleset = await rest()({
    method: HTTP_METHOD.GET,
    url: `${API.RULES}/${release.rulesetName}`,
    schema: rulesetSchema
  });
  return ruleset.source?.files ?? [];
}

const rulesStep: Step = {
  label: "Firestore security rules",
  plan() {
    const file = readRulesSource();
    return [
      `GET ${API.RULES}/${RULES_RELEASE_NAME}`,
      describeRequest(createRulesetRequest(file)),
      describeRequest(
        upsertReleaseRequest({
          rulesetName: "<new ruleset>",
          isExisting: true
        })
      )
    ];
  },
  async run() {
    const file = readRulesSource();
    const releasedFiles = await readReleasedRules();
    const isUnchanged = releasedFiles?.length === 1 && releasedFiles[0]?.content === file.content;
    if (isUnchanged) {
      return skipped("the released rules match firestore.rules");
    }

    const ruleset = await send({
      spec: createRulesetRequest(file),
      schema: rulesetSchema
    });
    await send({
      spec: upsertReleaseRequest({
        rulesetName: ruleset.name,
        isExisting: releasedFiles !== null
      }),
      schema: rulesReleaseSchema
    });
    return done(`released ${ruleset.name}`);
  }
};

const AUTH_MANUAL_STEP = `Open ${AUTH_CONSOLE_URL}, click "Get started" if shown, then Add new provider > Google > Enable > pick a support email > Save. That click creates the OAuth client Google sign-in needs, which no public API can do for a consumer project. Then rerun pnpm setup:gcp to confirm it`;

const enableGoogleRequest: RequestSpec = {
  method: HTTP_METHOD.PATCH,
  url: `${GOOGLE_IDP_URL}?updateMask=enabled`,
  body: {
    enabled: true
  }
};

function findAuthConfig() {
  return findResource({
    request: rest(),
    url: AUTH_CONFIG_URL,
    schema: authConfigSchema
  });
}

const googleSignInStep: Step = {
  label: "Google sign-in provider",
  plan: () => [
    `GET ${AUTH_CONFIG_URL}`,
    `GET ${GOOGLE_IDP_URL}`,
    `${describeRequest(enableGoogleRequest)} (only when it exists but is off)`
  ],
  async run() {
    if (!(await findAuthConfig())) {
      return manual(AUTH_MANUAL_STEP);
    }

    const google = await findResource({
      request: rest(),
      url: GOOGLE_IDP_URL,
      schema: idpConfigSchema
    });
    if (google?.enabled) {
      return skipped("enabled");
    }

    if (!google?.clientId) {
      return manual(AUTH_MANUAL_STEP);
    }

    await send({
      spec: enableGoogleRequest,
      schema: idpConfigSchema
    });
    return done("enabled with its existing OAuth client");
  }
};

function authorizedDomainsRequest(domains: string[]) {
  return {
    method: HTTP_METHOD.PATCH,
    url: `${AUTH_CONFIG_URL}?updateMask=authorizedDomains`,
    body: {
      authorizedDomains: domains
    }
  };
}

const authorizedDomainsStep: Step = {
  label: "Auth authorized domains",
  plan: () => [`GET ${AUTH_CONFIG_URL}`, describeRequest(authorizedDomainsRequest(["<current>", ...AUTH_DOMAINS]))],
  async run() {
    const config = await findAuthConfig();
    if (!config) {
      return manual(
        `Firebase Auth is not set up yet, so ${AUTH_DOMAINS.join(" and ")} cannot be authorized. Do the Google sign-in step above, then rerun`
      );
    }

    const current = config.authorizedDomains ?? [];
    const missing = AUTH_DOMAINS.filter(domain => !current.includes(domain));
    if (missing.length === 0) {
      return skipped(`already has ${AUTH_DOMAINS.join(", ")}`);
    }

    await send({
      spec: authorizedDomainsRequest([...current, ...missing]),
      schema: authConfigSchema
    });
    return done(`added ${missing.join(", ")}`);
  }
};

const STEPS: Step[] = [
  projectStep,
  billingStep,
  apisStep,
  firebaseStep,
  siteStep,
  webAppStep,
  linkSiteStep,
  firestoreStep,
  repositoryStep,
  runtimeAccountStep,
  runtimeRolesStep,
  buildAccountStep,
  buildProjectRolesStep,
  buildRepositoryRolesStep,
  rulesStep,
  googleSignInStep,
  authorizedDomainsStep
];

const manualSteps = await runSteps({
  title: "Set up GCP",
  steps: STEPS,
  isDryRun
});
if (manualSteps.length > 0) {
  console.log("\nStill to do by hand:");
  for (const step of manualSteps) {
    console.log(`  - ${step.detail}`);
  }
}

if (!isDryRun) {
  console.log("\nSetup finished. Deploy with: pnpm deploy:web");
}
