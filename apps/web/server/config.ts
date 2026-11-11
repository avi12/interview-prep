import { z } from "@/lib/zod.ts";
import { GCP } from "#scripts/lib/gcp.ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 8080;
const MAX_PORT = 65_535;
const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(APP_DIR, "..", "..");

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  GOOGLE_CLOUD_PROJECT: z.string().min(1).default(GCP.projectId),
  CLIENT_ROOT: z.string().min(1).default(resolve(APP_DIR, "dist-client")),
  CONTENT_ROOT: z.string().min(1).default(REPO_ROOT)
});

export function readConfig(env: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map(issue => issue.path.join(".")).join(", ")}`);
  }

  return {
    port: parsed.data.PORT,
    projectId: parsed.data.GOOGLE_CLOUD_PROJECT,
    clientRoot: resolve(parsed.data.CLIENT_ROOT),
    contentRoot: resolve(parsed.data.CONTENT_ROOT)
  };
}
