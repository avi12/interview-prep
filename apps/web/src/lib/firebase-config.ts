import { GCP } from "#scripts/lib/gcp.ts";
import { FIREBASE_INIT_PATH } from "@/lib/web-paths.ts";
import { zod } from "@/lib/zod.ts";

const firebaseConfigSchema = zod.object({
  apiKey: zod.string().min(1),
  authDomain: zod.string().min(1),
  projectId: zod.string().min(1),
  appId: zod.string().min(1)
});

export type FirebaseConfig = zod.infer<typeof firebaseConfigSchema>;

export const NO_CONFIG_REASON = "Sign-in is not set up on this server";

type ConfigResult =
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

export async function loadFirebaseConfig({ fetchJson, env }: { fetchJson: typeof fetch; env: DevEnv }) {
  const hosting = await hostingConfig(fetchJson);
  const parsed = hosting.success ? hosting : devConfig(env);
  if (!parsed.success) {
    return {
      isReady: false,
      reason: NO_CONFIG_REASON
    } satisfies ConfigResult;
  }

  return {
    isReady: true,
    config: parsed.data
  } satisfies ConfigResult;
}
