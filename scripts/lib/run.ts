import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { LESSON_TESTS_DIR_NAME } from "#scripts/lib/layout.ts";
import { CURRICULUM_DIR, DIST_DIR, KIT_DIR_NAME, ROOT } from "#scripts/lib/paths.ts";
import { runWithTimeout } from "#scripts/lib/process.ts";
import { Lang } from "#scripts/lib/schema.ts";
import type { Lesson } from "#scripts/lib/lessons.ts";

const VITEST_ENTRY = resolve(ROOT, "node_modules", "vitest", "vitest.mjs");
const MS_PER_SECOND = 1000;
const SOLUTION_OVERLAY_DIR_NAME = "solution-overlay";

export const ensureWorkCopy = (lesson: Lesson) => {
  if (existsSync(lesson.workDir)) return false;
  cpSync(resolve(lesson.dir, "starter"), lesson.workDir, { recursive: true });
  return true;
};

export const resetWorkCopy = (lesson: Lesson) => {
  rmSync(lesson.workDir, { recursive: true, force: true });
  ensureWorkCopy(lesson);
};

export const prepareSolutionDir = (lesson: Lesson) => {
  const dir = resolve(DIST_DIR, SOLUTION_OVERLAY_DIR_NAME, lesson.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(resolve(lesson.dir, "starter"), dir, { recursive: true });
  cpSync(resolve(lesson.dir, "solution"), dir, { recursive: true });
  return dir;
};

const commandFor = (lesson: Lesson) => {
  const testsDir = resolve(lesson.dir, LESSON_TESTS_DIR_NAME);
  if (lesson.meta.lang === Lang.py) {
    return { command: "python", args: ["-m", "pytest", "-q", "--tb=short", "-p", "no:cacheprovider", testsDir] };
  }
  return { command: process.execPath, args: [VITEST_ENTRY, "run", "--root", ROOT, testsDir] };
};

const envFor = (implDir: string) => ({
  ...process.env,
  IMPL_DIR: implDir,
  PYTHONPATH: resolve(CURRICULUM_DIR, KIT_DIR_NAME),
  PYTHONDONTWRITEBYTECODE: "1"
});

const timeoutMessage = (lesson: Lesson) =>
  `Stopped after ${lesson.meta.timeoutSeconds} seconds. Something never finishes: look for a loop whose exit condition is never reached, or a recursion with no base case.`;

const timeoutMsOf = (lesson: Lesson) => lesson.meta.timeoutSeconds * MS_PER_SECOND;

export const runQuiet = async ({ lesson, implDir }: { lesson: Lesson; implDir: string }) => {
  const { command, args } = commandFor(lesson);
  const { status, output, isTimedOut } = await runWithTimeout({ command, args, cwd: ROOT, env: envFor(implDir), timeoutMs: timeoutMsOf(lesson) });
  return { isPass: status === 0 && !isTimedOut, isTimedOut, output: isTimedOut ? `${timeoutMessage(lesson)}\n${output.slice(-500)}` : output };
};
