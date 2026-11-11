import { KIT_DIR_NAME, LESSON_TESTS_DIR_NAME } from "#scripts/lib/layout.ts";
import type { Lesson } from "#scripts/lib/lessons.ts";
import { CURRICULUM_DIR, DIST_DIR, ROOT } from "#scripts/lib/paths.ts";
import { runWithTimeout } from "#scripts/lib/process.ts";
import { parseQueryResults, queryResultsRelativePath } from "#scripts/lib/query-result.ts";
import { IMPL_DIR_ENV, RECORD_ENV } from "#scripts/lib/record-env.ts";
import { clearRecordFile, readRecordText } from "#scripts/lib/record-file.ts";
import { MS_PER_SECOND, type RunResult, timedOutOutput } from "#scripts/lib/run-result.ts";
import { Lang } from "#scripts/lib/schema.ts";
import { parseTestCases, testCasesRelativePath } from "#scripts/lib/test-cases.ts";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const VITEST_ENTRY = resolve(ROOT, "node_modules", "vitest", "vitest.mjs");
const SOLUTION_OVERLAY_DIR_NAME = "solution-overlay";
const PYTEST_CASE_RECORDER = "case_recorder";

export function ensureWorkCopy(lesson: Lesson) {
  if (existsSync(lesson.workDir)) {
    return false;
  }

  cpSync(resolve(lesson.dir, "starter"), lesson.workDir, { recursive: true });
  return true;
}

export function resetWorkCopy(lesson: Lesson) {
  rmSync(lesson.workDir, {
    recursive: true,
    force: true
  });
  ensureWorkCopy(lesson);
}

export function prepareSolutionDir(lesson: Lesson) {
  const dir = resolve(DIST_DIR, SOLUTION_OVERLAY_DIR_NAME, lesson.id);
  rmSync(dir, {
    recursive: true,
    force: true
  });
  mkdirSync(dir, { recursive: true });
  cpSync(resolve(lesson.dir, "starter"), dir, { recursive: true });
  cpSync(resolve(lesson.dir, "solution"), dir, { recursive: true });
  return dir;
}

function commandFor(lesson: Lesson) {
  const testsDir = resolve(lesson.dir, LESSON_TESTS_DIR_NAME);
  if (lesson.meta.lang === Lang.py) {
    return {
      command: "python",
      args: ["-m", "pytest", "-q", "--tb=short", "-p", "no:cacheprovider", "-p", PYTEST_CASE_RECORDER, testsDir]
    };
  }

  return {
    command: process.execPath,
    args: [VITEST_ENTRY, "run", "--root", ROOT, testsDir]
  };
}

function envFor({ implDir, queryResultFile, testCasesFile }: {
  implDir: string;
  queryResultFile: string;
  testCasesFile: string;
}) {
  return {
    ...process.env,
    [IMPL_DIR_ENV]: implDir,
    [RECORD_ENV.queryResults]: queryResultFile,
    [RECORD_ENV.testCases]: testCasesFile,
    PYTHONPATH: resolve(CURRICULUM_DIR, KIT_DIR_NAME),
    PYTHONDONTWRITEBYTECODE: "1"
  };
}

function timeoutMsOf(lesson: Lesson) {
  return lesson.meta.timeoutSeconds * MS_PER_SECOND;
}

export async function runQuiet({ lesson, implDir }: {
  lesson: Lesson;
  implDir: string;
}) {
  const { command, args } = commandFor(lesson);
  const queryResultFile = resolve(ROOT, queryResultsRelativePath(lesson.id));
  const testCasesFile = resolve(ROOT, testCasesRelativePath(lesson.id));
  clearRecordFile(queryResultFile);
  clearRecordFile(testCasesFile);
  const { status, output, isTimedOut } = await runWithTimeout({
    command,
    args,
    cwd: ROOT,
    env: envFor({
      implDir,
      queryResultFile,
      testCasesFile
    }),
    timeoutMs: timeoutMsOf(lesson)
  });
  return {
    isPass: status === 0 && !isTimedOut,
    isTimedOut,
    output: isTimedOut ? timedOutOutput({
      timeoutSeconds: lesson.meta.timeoutSeconds,
      output
    }) : output,
    queryResults: parseQueryResults(readRecordText(queryResultFile)),
    testCases: parseTestCases(readRecordText(testCasesFile))
  } satisfies RunResult;
}
