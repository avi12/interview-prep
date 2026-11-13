import {
  CURRICULUM_DIR_NAME,
  LESSON_TESTS_DIR_NAME,
  RUNNER_ENGINES_DIR_NAME,
  RUNNER_LESSONS_DIR_NAME,
  STARTER_DIR_NAME,
  WORK_DIR_NAME
} from "#scripts/lib/layout.ts";
import { Lang } from "#scripts/lib/schema.ts";
import { zod } from "#scripts/lib/zod.ts";

export const RunnableLang = {
  ts: Lang.TS,
  sql: Lang.SQL,
  py: Lang.PY
} as const;

export type RunnableLangName = (typeof RunnableLang)[keyof typeof RunnableLang];

export const RunnerDir = {
  curriculum: CURRICULUM_DIR_NAME,
  work: WORK_DIR_NAME,
  tests: LESSON_TESTS_DIR_NAME,
  starter: STARTER_DIR_NAME
} as const;

export const EnginePath = {
  ESBUILD_WASM: `${RUNNER_ENGINES_DIR_NAME}/esbuild/esbuild.wasm`,
  ESBUILD_MODULE: `${RUNNER_ENGINES_DIR_NAME}/esbuild/browser.js`,
  PGLITE_DIR: `${RUNNER_ENGINES_DIR_NAME}/pglite`,
  PYODIDE_DIR: `${RUNNER_ENGINES_DIR_NAME}/pyodide`
} as const;

export const PgliteFile = {
  MODULE: "index.js",
  WASM: "pglite.wasm",
  INITDB_WASM: "initdb.wasm",
  FS_BUNDLE: "pglite.data"
} as const;

const IMPORT_PREFIX_END = "/";

export const PYODIDE_MODULE_FILE = "pyodide.mjs";
export const PYODIDE_BASE_PACKAGES = ["pytest"] as const;

const filesSchema = zod.record(zod.string(), zod.string());

export const runnerLessonSchema = zod.object({
  id: zod.string(),
  lang: zod.enum(RunnableLang),
  timeoutSeconds: zod.number().int().positive(),
  isDatabaseNeeded: zod.boolean(),
  files: filesSchema
});

export const runnerKitSchema = zod.object({
  importMap: zod.record(zod.string(), zod.string()),
  setupFiles: zod.array(zod.string()),
  testTimeoutMs: zod.number(),
  hookTimeoutMs: zod.number(),
  tsFiles: filesSchema,
  pyFiles: filesSchema
});

export type RunnerLesson = zod.infer<typeof runnerLessonSchema>;
export type RunnerKit = zod.infer<typeof runnerKitSchema>;
export type LessonFiles = zod.infer<typeof filesSchema>;

export function mapImport({ specifier, importMap }: { specifier: string; importMap: Record<string, string> }) {
  const exact = importMap[specifier];
  if (exact) {
    return exact;
  }

  for (const [prefix, target] of Object.entries(importMap)) {
    const isPrefixEndsWithImportPrefixEnd = prefix.endsWith(IMPORT_PREFIX_END) && specifier.startsWith(prefix);
    if (isPrefixEndsWithImportPrefixEnd) {
      return `${target}${specifier.slice(prefix.length)}`;
    }
  }
  return undefined;
}

export function runnerLessonPath(id: string) {
  return `${RUNNER_LESSONS_DIR_NAME}/${id}.json`;
}

export function isRunnableLang(lang: string): lang is RunnableLangName {
  return Object.values<string>(RunnableLang).includes(lang);
}
