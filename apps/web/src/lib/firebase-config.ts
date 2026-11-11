import { FIREBASE_INIT_PATH } from "@/lib/web-paths.ts";
import { z } from "@/lib/zod.ts";
import { GCP } from "#scripts/lib/gcp.ts";

const firebaseConfigSchema = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  projectId: z.string().min(1),
  appId: z.string().min(1)
});

export type FirebaseConfig = z.infer<typeof firebaseConfigSchema>;

export const NO_CONFIG_REASON = "Sign-in is not set up on this server";

export type ConfigResult =
  | {
    isReady: true;
    config: FirebaseConfig;
  }
  | {
    isReady: false;
    reason: string;
  };

type DevEnv = Record<string, unknown>;

function devConfig(env: DevEnv) {
  return firebaseConfigSchema.safeParse({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? GCP.projectId,
    appId: env.VITE_FIREBASE_APP_ID
  });
}

async function hostingConfig(fetchJson: typeof fetch) {
  try {
    const response = await fetchJson(FIREBASE_INIT_PATH, {
      headers: {
        Accept: "application/json"
      }
    });
    const body: unknown = response.ok ? await response.json() : undefined;
    return firebaseConfigSchema.safeParse(body);
  } catch {
    return firebaseConfigSchema.safeParse(undefined);
  }
}

export async function loadFirebaseConfig({ fetchJson, env }: {
  fetchJson: typeof fetch;
  env: DevEnv;
}): Promise<ConfigResult> {
  const hosting = await hostingConfig(fetchJson);
  const parsed = hosting.success ? hosting : devConfig(env);
  if (!parsed.success) {
    return {
      isReady: false,
      reason: NO_CONFIG_REASON
    };
  }

  return {
    isReady: true,
    config: parsed.data
  };
}
