import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { readJsonFile } from "#scripts/lib/files.ts";
import { API, HTTP_METHOD } from "#scripts/lib/firebase-rest.ts";
import { GCP } from "#scripts/lib/gcp.ts";
import { ROOT } from "#scripts/lib/paths.ts";
import { zod } from "#scripts/lib/zod.ts";

const FIREBASE_JSON_FILE = resolve(ROOT, "firebase.json");

const runRewriteSchema = zod
  .object({
    source: zod.string().min(1),
    run: zod
      .object({
        serviceId: zod.string().min(1),
        region: zod.string().min(1)
      })
      .strict()
  })
  .strict();

const firebaseJsonSchema = zod
  .object({
    hosting: zod
      .object({
        site: zod.string().min(1),
        rewrites: zod.array(runRewriteSchema).min(1)
      })
      .strict(),
    firestore: zod.object({ rules: zod.string().min(1) }).strict()
  })
  .strict();

export type FirebaseJson = zod.infer<typeof firebaseJsonSchema>;

interface HostingTarget {
  hostingSiteId: string;
  runService: string;
  region: string;
}

export const siteSchema = zod.object({
  name: zod.string(),
  defaultUrl: zod.string().optional(),
  appId: zod.string().optional()
});

export const versionSchema = zod.object({
  name: zod.string(),
  status: zod.string().optional()
});

export const releaseSchema = zod.object({ name: zod.string() });

export function readFirebaseJson() {
  return readJsonFile({
    path: FIREBASE_JSON_FILE,
    schema: firebaseJsonSchema
  });
}

export function toServingConfig(hosting: FirebaseJson["hosting"]) {
  return {
    rewrites: hosting.rewrites.map(rewrite => ({
      glob: rewrite.source,
      run: {
        serviceId: rewrite.run.serviceId,
        region: rewrite.run.region
      }
    }))
  };
}

export function findGcpMismatches({ config, target }: { config: FirebaseJson; target: HostingTarget }) {
  const mismatches: string[] = [];
  if (config.hosting.site !== target.hostingSiteId) {
    mismatches.push(`hosting.site is "${config.hosting.site}" but GCP.hostingSiteId is "${target.hostingSiteId}"`);
  }

  for (const rewrite of config.hosting.rewrites) {
    if (rewrite.run.serviceId !== target.runService) {
      mismatches.push(
        `rewrite "${rewrite.source}" runs "${rewrite.run.serviceId}" but GCP.runService is "${target.runService}"`
      );
    }

    if (rewrite.run.region !== target.region) {
      mismatches.push(`rewrite "${rewrite.source}" is in "${rewrite.run.region}" but GCP.region is "${target.region}"`);
    }
  }

  return mismatches;
}

export function readCheckedFirebaseJson() {
  const config = readFirebaseJson();
  const mismatches = findGcpMismatches({
    config,
    target: GCP
  });
  const rulesFile = resolve(ROOT, config.firestore.rules);
  if (!existsSync(rulesFile)) {
    mismatches.push(`firestore.rules points at ${config.firestore.rules}, which does not exist`);
  }

  if (mismatches.length > 0) {
    throw new Error(`firebase.json disagrees with scripts/lib/gcp.ts:\n  ${mismatches.join("\n  ")}`);
  }

  return {
    config,
    rulesFile
  };
}

const SITE_PARENT = `${API.HOSTING}/projects/${GCP.projectId}/sites`;
const SITE_URL = `${SITE_PARENT}/${GCP.hostingSiteId}`;

export function getSiteRequest() {
  return {
    method: HTTP_METHOD.GET,
    url: SITE_URL
  };
}

export function createSiteRequest() {
  return {
    method: HTTP_METHOD.POST,
    url: `${SITE_PARENT}?siteId=${GCP.hostingSiteId}`,
    body: {}
  };
}

export function linkSiteAppRequest(appId: string) {
  return {
    method: HTTP_METHOD.PATCH,
    url: `${SITE_URL}?updateMask=appId`,
    body: {
      appId
    }
  };
}

export function createVersionRequest(hosting: FirebaseJson["hosting"]) {
  return {
    method: HTTP_METHOD.POST,
    url: `${API.HOSTING}/sites/${hosting.site}/versions`,
    body: {
      config: toServingConfig(hosting)
    }
  };
}

export function finalizeVersionRequest(versionName: string) {
  return {
    method: HTTP_METHOD.PATCH,
    url: `${API.HOSTING}/${versionName}?updateMask=status`,
    body: {
      status: "FINALIZED"
    }
  };
}

export function createReleaseRequest({
  site,
  versionName,
  message
}: {
  site: string;
  versionName: string;
  message: string;
}) {
  return {
    method: HTTP_METHOD.POST,
    url: `${API.HOSTING}/sites/${site}/releases?versionName=${encodeURIComponent(versionName)}`,
    body: {
      message
    }
  };
}
