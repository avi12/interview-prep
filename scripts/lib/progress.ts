import { readJsonFile, writeFileDeep } from "#scripts/lib/files.ts";
import { LAST_TEST_FILE, PROGRESS_FILE } from "#scripts/lib/paths.ts";
import { progressSchema } from "#scripts/lib/schema.ts";

const MAX_TEST_OUTPUT_CHARS = 4000;
const ANSI_ESCAPE = /\u001b\[[0-9;]*m/g;

export function recordLastTest({ id, isPass, output }: {
  id: string;
  isPass: boolean;
  output: string;
}) {
  return writeFileDeep({
    path: LAST_TEST_FILE,
    content: JSON.stringify({
      id,
      isPass,
      at: new Date().toISOString(),
      output: output.replace(ANSI_ESCAPE, "").slice(-MAX_TEST_OUTPUT_CHARS)
    }, null, 2)
  });
}

export function readProgress() {
  return readJsonFile({
    path: PROGRESS_FILE,
    schema: progressSchema,
    fallback: {}
  });
}

export function recordAttempt({ id, isPass }: {
  id: string;
  isPass: boolean;
}) {
  const progress = readProgress();
  const previous = progress[id] ?? {
    attempts: 0,
    passedAt: null
  };
  progress[id] = {
    attempts: previous.attempts + 1,
    passedAt: isPass ? (previous.passedAt ?? new Date().toISOString()) : previous.passedAt
  };
  writeFileDeep({
    path: PROGRESS_FILE,
    content: JSON.stringify(progress, null, 2)
  });
}
