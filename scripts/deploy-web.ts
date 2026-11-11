import {
  createReleaseRequest,
  createVersionRequest,
  finalizeVersionRequest,
  readCheckedFirebaseJson,
  releaseSchema,
  versionSchema
} from "#scripts/lib/firebase-rest-hosting.ts";
import {
  createRestClient,
  describeRequest,
  HTTP_STATUS,
  retryUntil,
  withRequestLog
} from "#scripts/lib/firebase-rest.ts";
import { done, runSteps, type Step } from "#scripts/lib/gcloud-steps.ts";
import {
  BUILD_SERVICE_ACCOUNT,
  describeGcloud,
  hasFlag,
  IMAGE_REPOSITORY,
  mustRunCommand,
  mustRunGcloud,
  printAccessToken,
  runCommand,
  RUNTIME_SERVICE_ACCOUNT,
  toCommandLine
} from "#scripts/lib/gcloud.ts";
import { GCP, HEALTH_PATH, WEB_ORIGIN } from "#scripts/lib/gcp.ts";
import {
  INDEX_RELATIVE_PATH,
  LESSONS_DIST_RELATIVE_DIR,
  RUNNER_DIST_RELATIVE_DIR,
  RUNNER_ENGINES_DIR_NAME
} from "#scripts/lib/layout.ts";
import { ROOT } from "#scripts/lib/paths.ts";
import { z } from "#scripts/lib/zod.ts";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const isDryRun = hasFlag("dry-run");

const WEB_APP_DIR = "apps/web";
const DOCKERFILE = `${WEB_APP_DIR}/Dockerfile`;
const CONTAINER_PORT = 8080;
const RUN_LIMITS = {
  memory: "512Mi",
  cpu: "1",
  minInstances: 0,
  maxInstances: 3,
  concurrency: 80,
  timeoutSeconds: 60
};
const SMOKE_ATTEMPTS = 12;
const SMOKE_DELAY_MS = 5000;
const FIREBASE_INIT_PATH = "/__/firebase/init.json";
const CLOUD_BUILDER_DOCKER = "gcr.io/cloud-builders/docker";
const BUILD_LOGGING = "CLOUD_LOGGING_ONLY";

const ROOT_BUILD_OUTPUTS = [INDEX_RELATIVE_PATH, LESSONS_DIST_RELATIVE_DIR, RUNNER_DIST_RELATIVE_DIR];
const ENGINE_OUTPUTS = [`${RUNNER_DIST_RELATIVE_DIR}/${RUNNER_ENGINES_DIR_NAME}`];
const WEB_BUILD_OUTPUTS = [`${WEB_APP_DIR}/dist-client/index.html`, `${WEB_APP_DIR}/dist-server/server.js`];
const IMAGE_INPUTS = [DOCKERFILE, ".gcloudignore"];

const firebaseInitSchema = z.object({
  projectId: z.string(),
  apiKey: z.string(),
  appId: z.string()
});

function readGitShortSha() {
  const result = runCommand({
    command: "git",
    args: ["rev-parse", "--short", "HEAD"]
  });
  return result.isSuccess ? result.stdout.trim() : "nogit";
}

function imageTag() {
  const stamp = new Date().toISOString().replaceAll(/[-:]/g, "").replace("T", "-").slice(0, 15);
  return `${stamp}-${readGitShortSha()}`;
}

const IMAGE = `${IMAGE_REPOSITORY}:${imageTag()}`;

function assertOutputs(paths: string[]) {
  const missing = paths.filter(path => !existsSync(resolve(ROOT, path)));
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.join(", ")}`);
  }
}

function buildStep({ label, args, outputs }: {
  label: string;
  args: string[];
  outputs: string[];
}): Step {
  return {
    label,
    plan: () => [toCommandLine({
      command: "pnpm",
      args
    }), `expect ${outputs.join(", ")}`],
    async run() {
      mustRunCommand({
        command: "pnpm",
        args
      });
      assertOutputs(outputs);
      return done(`built ${outputs.join(", ")}`);
    }
  };
}

function cloudBuildConfig() {
  return {
    steps: [{
      name: CLOUD_BUILDER_DOCKER,
      args: ["build", "--file", DOCKERFILE, "--tag", IMAGE, "."]
    }],
    images: [IMAGE],
    serviceAccount: `projects/${GCP.projectId}/serviceAccounts/${BUILD_SERVICE_ACCOUNT}`,
    options: {
      logging: BUILD_LOGGING
    }
  };
}

function submitBuildArgs(configPath: string) {
  return ["builds", "submit", ".", `--config=${configPath}`];
}

const imageStep: Step = {
  label: "build and push the image with Cloud Build",
  plan: () => [
    `write a Cloud Build config: ${JSON.stringify(cloudBuildConfig())}`,
    describeGcloud(submitBuildArgs("<config>.json"))
  ],
  async run() {
    assertOutputs(IMAGE_INPUTS);
    const configDir = mkdtempSync(join(tmpdir(), "interview-prep-build-"));
    const configPath = join(configDir, "cloudbuild.json");
    writeFileSync(configPath, JSON.stringify(cloudBuildConfig(), null, 2));
    try {
      mustRunGcloud({ args: submitBuildArgs(configPath) });
    } finally {
      rmSync(configDir, {
        recursive: true,
        force: true
      });
    }

    return done(`pushed ${IMAGE}`);
  }
};

const RUN_DEPLOY_ARGS = [
  "run",
  "deploy",
  GCP.runService,
  `--image=${IMAGE}`,
  `--region=${GCP.region}`,
  `--service-account=${RUNTIME_SERVICE_ACCOUNT}`,
  "--allow-unauthenticated",
  `--set-env-vars=GOOGLE_CLOUD_PROJECT=${GCP.projectId}`,
  `--port=${CONTAINER_PORT}`,
  `--memory=${RUN_LIMITS.memory}`,
  `--cpu=${RUN_LIMITS.cpu}`,
  `--min-instances=${RUN_LIMITS.minInstances}`,
  `--max-instances=${RUN_LIMITS.maxInstances}`,
  `--concurrency=${RUN_LIMITS.concurrency}`,
  `--timeout=${RUN_LIMITS.timeoutSeconds}`
];

const runStep: Step = {
  label: `deploy Cloud Run service ${GCP.runService}`,
  plan: () => [describeGcloud(RUN_DEPLOY_ARGS)],
  async run() {
    mustRunGcloud({ args: RUN_DEPLOY_ARGS });
    return done(`serving ${IMAGE}`);
  }
};

function hostingStep(): Step {
  const { config } = readCheckedFirebaseJson();
  const releaseMessage = `Cloud Run ${GCP.runService} ${IMAGE}`;
  return {
    label: `release Firebase Hosting site ${config.hosting.site}`,
    plan: () => [
      describeRequest(createVersionRequest(config.hosting)),
      describeRequest(finalizeVersionRequest("<version>")),
      describeRequest(
        createReleaseRequest({
          site: config.hosting.site,
          versionName: "<version>",
          message: releaseMessage
        })
      )
    ],
    async run() {
      const request = withRequestLog(
        createRestClient({
          accessToken: printAccessToken(),
          quotaProject: GCP.projectId
        })
      );
      const version = await request({
        ...createVersionRequest(config.hosting),
        schema: versionSchema
      });
      await request({
        ...finalizeVersionRequest(version.name),
        schema: versionSchema
      });
      const release = await request({
        ...createReleaseRequest({
          site: config.hosting.site,
          versionName: version.name,
          message: releaseMessage
        }),
        schema: releaseSchema
      });
      return done(`${release.name} is live at ${WEB_ORIGIN}`);
    }
  };
}

async function fetchUntil<Result>({ url, read }: {
  url: string;
  read: (response: Response) => Promise<Result | undefined>;
}) {
  let lastProblem = "no response";
  const result = await retryUntil({
    attempts: SMOKE_ATTEMPTS,
    delayMs: SMOKE_DELAY_MS,
    async attempt() {
      const response = await fetch(url, { cache: "no-store" }).catch((error: unknown) => {
        lastProblem = error instanceof Error ? error.message : String(error);
        return null;
      });
      if (!response) {
        return undefined;
      }

      lastProblem = `HTTP ${response.status}`;
      return response.status === HTTP_STATUS.ok ? read(response) : undefined;
    }
  });
  if (result === undefined) {
    throw new Error(`GET ${url} failed after ${SMOKE_ATTEMPTS} tries: ${lastProblem}`);
  }

  return result;
}

const smokeStep: Step = {
  label: "smoke test",
  plan: () => [`GET ${WEB_ORIGIN}${HEALTH_PATH} expects 200`, `GET ${WEB_ORIGIN}${FIREBASE_INIT_PATH} expects the Firebase web config`],
  async run() {
    await fetchUntil({
      url: `${WEB_ORIGIN}${HEALTH_PATH}`,
      read: async () => true
    });
    const initConfig = await fetchUntil({
      url: `${WEB_ORIGIN}${FIREBASE_INIT_PATH}`,
      async read(response) {
        const parsed = firebaseInitSchema.safeParse(await response.json().catch(() => null));
        return parsed.success ? parsed.data : undefined;
      }
    });
    if (initConfig.projectId !== GCP.projectId) {
      throw new Error(`${FIREBASE_INIT_PATH} serves project ${initConfig.projectId}, expected ${GCP.projectId}`);
    }

    return done(`${HEALTH_PATH} is 200 and ${FIREBASE_INIT_PATH} serves app ${initConfig.appId}`);
  }
};

const STEPS: Step[] = [
  buildStep({
    label: "build lessons",
    args: ["build"],
    outputs: ROOT_BUILD_OUTPUTS
  }),
  buildStep({
    label: "self-host the test engines",
    args: ["build:engines"],
    outputs: ENGINE_OUTPUTS
  }),
  buildStep({
    label: "build the web app",
    args: ["-C", WEB_APP_DIR, "build"],
    outputs: WEB_BUILD_OUTPUTS
  }),
  imageStep,
  runStep,
  hostingStep(),
  smokeStep
];

await runSteps({
  title: `Deploy the web trainer as ${IMAGE}`,
  steps: STEPS,
  isDryRun
});

if (!isDryRun) {
  console.log(`\nLive at ${WEB_ORIGIN}`);
}
