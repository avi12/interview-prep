import { VERSION_PATH } from "@/lib/web-paths.ts";
import { z } from "@/lib/zod.ts";

export const VERSION_POLL_INTERVAL_MS = 60_000;

const versionFileSchema = z.object({ version: z.string().min(1) }).strict();

export async function fetchDeployedVersion(fetchJson: typeof fetch) {
  const response = await fetchJson(VERSION_PATH, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) {
    return null;
  }

  const parsed = versionFileSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data.version : null;
}

export function watchForUpdates({ currentVersion, onUpdate, fetchJson = fetch }: {
  currentVersion: string;
  onUpdate: () => void;
  fetchJson?: typeof fetch;
}) {
  async function check() {
    const deployedVersion = await fetchDeployedVersion(fetchJson);
    if (!deployedVersion || deployedVersion === currentVersion) {
      return;
    }

    onUpdate();
  }

  const timer = setInterval(() => void check(), VERSION_POLL_INTERVAL_MS);
  return () => clearInterval(timer);
}
