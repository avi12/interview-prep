import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PROGRESS_FILE } from "#scripts/lib/paths.ts";
import { progressSchema } from "#scripts/lib/schema.ts";

export const readProgress = () => {
  if (!existsSync(PROGRESS_FILE)) return {};
  const parsed = progressSchema.safeParse(JSON.parse(readFileSync(PROGRESS_FILE, "utf8")));
  return parsed.success ? parsed.data : {};
};

export const recordAttempt = ({ id, isPass }: { id: string; isPass: boolean }) => {
  const progress = readProgress();
  const previous = progress[id] ?? { attempts: 0, passedAt: null };
  progress[id] = {
    attempts: previous.attempts + 1,
    passedAt: isPass ? (previous.passedAt ?? new Date().toISOString()) : previous.passedAt
  };
  mkdirSync(dirname(PROGRESS_FILE), { recursive: true });
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
};

export const isPassed = ({ id, progress }: { id: string; progress: ReturnType<typeof readProgress> }) =>
  Boolean(progress[id]?.passedAt);
