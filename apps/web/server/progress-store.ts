import type { Progress } from "#scripts/lib/progress-sync.ts";

export interface ProgressStore {
  read: (uid: string) => Promise<Progress>;
  update: (change: {
    uid: string;
    apply: (stored: Progress) => Progress;
  }) => Promise<Progress>;
}
