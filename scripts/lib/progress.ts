import { writeFileDeep, readJsonFile } from "#scripts/lib/files.ts";
import { PROGRESS_FILE } from "#scripts/lib/paths.ts";
import { progressSchema } from "#scripts/lib/schema.ts";

export const readProgress = () => readJsonFile({ path: PROGRESS_FILE, schema: progressSchema, fallback: {} });

export const recordAttempt = ({ id, isPass }: { id: string; isPass: boolean }) => {
  const progress = readProgress();
  const previous = progress[id] ?? { attempts: 0, passedAt: null };
  progress[id] = {
    attempts: previous.attempts + 1,
    passedAt: isPass ? (previous.passedAt ?? new Date().toISOString()) : previous.passedAt
  };
  writeFileDeep({ path: PROGRESS_FILE, content: JSON.stringify(progress, null, 2) });
};
