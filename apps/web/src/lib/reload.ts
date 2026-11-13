import { browserSessionStorage, readStored, writeStored } from "@/lib/browser-storage.ts";
import { zod } from "@/lib/zod.ts";

export const AUTO_RELOAD_TIMES_KEY = "interviewPrep.autoReloadTimes";
export const AUTO_RELOAD_COOLDOWN_MS = 30_000;
export const AUTO_RELOAD_WINDOW_MS = 600_000;
export const AUTO_RELOAD_MAX_COUNT = 3;

const reloadTimesSchema = zod.array(zod.number());

function recentReloadTimes({ storage, now }: { storage: Storage | null; now: number }) {
  const stored = readStored({
    storage,
    key: AUTO_RELOAD_TIMES_KEY,
    schema: reloadTimesSchema,
    fallback: []
  });
  return stored.filter(time => now - time < AUTO_RELOAD_WINDOW_MS);
}

export function reloadForUpdate({
  storage = browserSessionStorage(),
  now = Date.now(),
  reload = () => location.reload()
}: {
  storage?: Storage | null;
  now?: number;
  reload?: () => void;
} = {}) {
  const reloadTimes = recentReloadTimes({
    storage,
    now
  });
  const isWithinCooldown = reloadTimes.some(time => now - time < AUTO_RELOAD_COOLDOWN_MS);
  const isReloadLimitReached = reloadTimes.length >= AUTO_RELOAD_MAX_COUNT;
  const isReloadBlocked = isWithinCooldown || isReloadLimitReached;
  if (isReloadBlocked) {
    return false;
  }

  writeStored({
    storage,
    key: AUTO_RELOAD_TIMES_KEY,
    value: [...reloadTimes, now]
  });
  reload();
  return true;
}
