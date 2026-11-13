import { readFileSync, rmSync } from "node:fs";
import { posix, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { readTextTree, writeFileDeep } from "#scripts/lib/files.ts";
import { RUNNER_KIT_FILE_NAME, RUNNER_LESSONS_DIR_NAME } from "#scripts/lib/layout.ts";
import type { Lesson } from "#scripts/lib/lessons.ts";
import { KIT_DIR, ROOT, RUNNER_DIST_DIR } from "#scripts/lib/paths.ts";
import {
  isRunnableLang,
  type LessonFiles,
  mapImport,
  RunnerDir,
  type RunnerKit,
  type RunnerLesson,
  runnerLessonPath
} from "#scripts/lib/runner-bundle.ts";
import { zod } from "#scripts/lib/zod.ts";

const BROWSER_CONDITION = "browser";
const DEFAULT_CONDITION = "default";
const PATTERN_WILDCARD = "*";
const CURRENT_DIR_PREFIX = "./";
const TS_EXTENSION = ".ts";
const PY_EXTENSION = ".py";
const TEST_FILE = /\.test\.ts$/;
const DATABASE_MODULE = "@electric-sql/pglite";
const STATIC_IMPORT = /^\s*(?:import|export)\s+(?!type\s)(?:[^;]*?\sfrom\s*)?["']([^"']+)["']/gm;
const DYNAMIC_IMPORT = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
const RELATIVE_PREFIX = ".";
const RM_MAX_RETRIES = 5;
const RM_RETRY_DELAY_MS = 100;

const importTargetSchema = zod.union([zod.string(), zod.record(zod.string(), zod.string())]);
const packageJsonSchema = zod.object({ imports: zod.record(zod.string(), importTargetSchema) });
const vitestConfigSchema = zod.object({
  default: zod.object({
    test: zod.object({
      setupFiles: zod.array(zod.string()),
      testTimeout: zod.number(),
      hookTimeout: zod.number()
    })
  })
});

function toRepoPath(target: string) {
  return target.replace(CURRENT_DIR_PREFIX, "").replace(PATTERN_WILDCARD, "");
}

function readImports() {
  const parsed = packageJsonSchema.safeParse(JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")));
  if (!parsed.success) {
    throw new Error(`package.json imports are not in the expected shape: ${parsed.error.message}`);
  }

  return parsed.data.imports;
}

function browserImports() {
  const importMap: Record<string, string> = {};
  const nodeOnlyFiles = new Set<string>();
  for (const [pattern, target] of Object.entries(readImports())) {
    const key = pattern.replace(PATTERN_WILDCARD, "");
    if (typeof target === "string") {
      importMap[key] = toRepoPath(target);
      continue;
    }

    const browserTarget = target[BROWSER_CONDITION] ?? target[DEFAULT_CONDITION];
    importMap[key] = toRepoPath(browserTarget);
    const defaultTarget = target[DEFAULT_CONDITION];
    const isOtherDefaultTarget = defaultTarget && defaultTarget !== browserTarget;
    if (isOtherDefaultTarget) {
      nodeOnlyFiles.add(toRepoPath(defaultTarget));
    }
  }
  return {
    importMap,
    nodeOnlyFiles
  };
}

function specifiersOf(source: string) {
  return [...source.matchAll(STATIC_IMPORT), ...source.matchAll(DYNAMIC_IMPORT)].map(match => match[1]);
}

function importClosure({ entries, importMap }: { entries: string[]; importMap: Record<string, string> }) {
  const files: LessonFiles = {};
  const externals = new Set<string>();
  const pending = [...entries];
  for (let path = pending.pop(); path !== undefined; path = pending.pop()) {
    if (files[path] !== undefined) {
      continue;
    }

    const source = readFileSync(resolve(ROOT, path), "utf8");
    files[path] = source;
    for (const specifier of specifiersOf(source)) {
      const mapped = mapImport({
        specifier,
        importMap
      });
      if (mapped) {
        pending.push(mapped);
        continue;
      }

      if (specifier.startsWith(RELATIVE_PREFIX)) {
        pending.push(posix.join(posix.dirname(path), specifier));
        continue;
      }

      externals.add(specifier);
    }
  }
  return {
    files,
    externals
  };
}

function repoPathOf(path: string) {
  return relative(ROOT, path).split("\\").join(posix.sep);
}

async function readVitestSettings() {
  const parsed = vitestConfigSchema.safeParse(await import(pathToFileURL(resolve(ROOT, "vitest.config.ts")).href));
  if (!parsed.success) {
    throw new Error(`vitest.config.ts is not in the expected shape: ${parsed.error.message}`);
  }

  return parsed.data.default.test;
}

function kitFilesWith(extension: string) {
  return Object.keys(readTextTree(KIT_DIR))
    .filter(path => path.endsWith(extension))
    .map(path => repoPathOf(resolve(KIT_DIR, path)));
}

async function buildKit() {
  const { importMap, nodeOnlyFiles } = browserImports();
  const { setupFiles, testTimeout, hookTimeout } = await readVitestSettings();
  function isBrowserEntry(path: string) {
    return !nodeOnlyFiles.has(path) && !TEST_FILE.test(path);
  }

  const tsEntries = [...kitFilesWith(TS_EXTENSION), ...setupFiles].filter(isBrowserEntry);
  const pyFiles: LessonFiles = {};
  for (const path of kitFilesWith(PY_EXTENSION)) {
    pyFiles[posix.basename(path)] = readFileSync(resolve(ROOT, path), "utf8");
  }
  return {
    importMap,
    setupFiles,
    testTimeoutMs: testTimeout,
    hookTimeoutMs: hookTimeout,
    tsFiles: importClosure({
      entries: tsEntries,
      importMap
    }).files,
    pyFiles
  } satisfies RunnerKit;
}

function learnerVisibleFiles(lesson: Lesson) {
  const files: LessonFiles = {};
  for (const dir of [RunnerDir.tests, RunnerDir.starter]) {
    for (const [path, text] of Object.entries(readTextTree(resolve(lesson.dir, dir)))) {
      files[`${dir}/${path}`] = text;
    }
  }
  return files;
}

function isDatabaseNeeded({
  lesson,
  files,
  importMap
}: {
  lesson: Lesson;
  files: LessonFiles;
  importMap: Record<string, string>;
}) {
  const lessonRoot = repoPathOf(lesson.dir);
  const entries = Object.keys(files)
    .filter(path => path.endsWith(TS_EXTENSION))
    .map(path => `${lessonRoot}/${path}`);
  return importClosure({
    entries,
    importMap
  }).externals.has(DATABASE_MODULE);
}

function lessonBundle({ lesson, importMap }: { lesson: Lesson; importMap: Record<string, string> }) {
  const { lang } = lesson.meta;
  const isNotRunnableExercise = !lesson.hasExercise || !isRunnableLang(lang);
  if (isNotRunnableExercise) {
    return undefined;
  }

  const files = learnerVisibleFiles(lesson);
  return {
    id: lesson.id,
    lang,
    timeoutSeconds: lesson.meta.timeoutSeconds,
    isDatabaseNeeded: isDatabaseNeeded({
      lesson,
      files,
      importMap
    }),
    files
  } satisfies RunnerLesson;
}

export async function writeRunnerData(lessons: Lesson[]) {
  rmSync(resolve(RUNNER_DIST_DIR, RUNNER_LESSONS_DIR_NAME), {
    recursive: true,
    force: true,
    maxRetries: RM_MAX_RETRIES,
    retryDelay: RM_RETRY_DELAY_MS
  });
  const kit = await buildKit();
  writeFileDeep({
    path: resolve(RUNNER_DIST_DIR, RUNNER_KIT_FILE_NAME),
    content: JSON.stringify(kit)
  });
  let count = 0;
  for (const lesson of lessons) {
    const bundle = lessonBundle({
      lesson,
      importMap: kit.importMap
    });
    if (!bundle) {
      continue;
    }

    count++;
    writeFileDeep({
      path: resolve(RUNNER_DIST_DIR, runnerLessonPath(lesson.id)),
      content: JSON.stringify(bundle)
    });
  }
  return count;
}
