import type { ProgressStore } from "@server/progress-store.ts";
import type { Progress } from "#scripts/lib/progress-sync.ts";

export function createMemoryProgressStore(): ProgressStore {
  const progressByUid = new Map<string, Progress>();
  return {
    read: async uid => progressByUid.get(uid) ?? {},
    async update({ uid, apply }) {
      const progress = apply(progressByUid.get(uid) ?? {});
      progressByUid.set(uid, progress);
      return progress;
    }
  };
}
