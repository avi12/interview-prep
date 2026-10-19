import { spawnSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { CURRICULUM_DIR, KIT_DIR_NAME, ROOT } from "#scripts/lib/paths.ts";
import { Lang } from "#scripts/lib/schema.ts";
import type { Lesson } from "#scripts/lib/lessons.ts";

const VITEST_ENTRY = resolve(ROOT, "node_modules", "vitest", "vitest.mjs");

export const ensureWorkCopy = (lesson: Lesson) => {
  if (existsSync(lesson.workDir)) return false;
  cpSync(resolve(lesson.dir, "starter"), lesson.workDir, { recursive: true });
  return true;
};

export const resetWorkCopy = (lesson: Lesson) => {
  rmSync(lesson.workDir, { recursive: true, force: true });
  ensureWorkCopy(lesson);
};

const commandFor = (lesson: Lesson) => {
  const testsDir = resolve(lesson.dir, "tests");
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

export const runTests = ({ lesson, implDir }: { lesson: Lesson; implDir: string }) => {
  const { command, args } = commandFor(lesson);
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit", env: envFor(implDir) });
  return result.status === 0;
};

export const runQuiet = ({ lesson, implDir }: { lesson: Lesson; implDir: string }) => {
  const { command, args } = commandFor(lesson);
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", env: envFor(implDir) });
  return { isPass: result.status === 0, output: `${result.stdout}\n${result.stderr}` };
};
