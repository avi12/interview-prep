import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { PROGRESS_FILE } from "#scripts/lib/paths.ts";

const progressSchema = z.record(
  z.string(),
  z.object({
    attempts: z.number().int(),
    passedAt: z.string().nullable()
  })
);

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
