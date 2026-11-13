import type { Progress } from "#scripts/lib/progress-sync.ts";

interface ProgressChange {
  uid: string;
  apply: (stored: Progress) => Progress;
}

export interface ProgressStore {
  read: (uid: string) => Promise<Progress>;
  update: (change: ProgressChange) => Promise<Progress>;
}
