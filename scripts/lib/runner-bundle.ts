import {
  CURRICULUM_DIR_NAME,
  LESSON_TESTS_DIR_NAME,
  RUNNER_ENGINES_DIR_NAME,
  RUNNER_LESSONS_DIR_NAME,
  STARTER_DIR_NAME,
  WORK_DIR_NAME
} from "#scripts/lib/layout.ts";
import { Lang } from "#scripts/lib/schema.ts";
import { z } from "#scripts/lib/zod.ts";

export const RunnableLang = {
  ts: Lang.ts,
  sql: Lang.sql,
  py: Lang.py
} as const;

export type RunnableLangName = typeof RunnableLang[keyof typeof RunnableLang];

export const RunnerDir = {
  curriculum: CURRICULUM_DIR_NAME,
  work: WORK_DIR_NAME,
  tests: LESSON_TESTS_DIR_NAME,
  starter: STARTER_DIR_NAME
} as const;

export const EnginePath = {
  esbuildWasm: `${RUNNER_ENGINES_DIR_NAME}/esbuild/esbuild.wasm`,
  esbuildModule: `${RUNNER_ENGINES_DIR_NAME}/esbuild/browser.js`,
  pgliteDir: `${RUNNER_ENGINES_DIR_NAME}/pglite`,
  pyodideDir: `${RUNNER_ENGINES_DIR_NAME}/pyodide`
} as const;

export const PgliteFile = {
  module: "index.js",
  wasm: "pglite.wasm",
  initdbWasm: "initdb.wasm",
  fsBundle: "pglite.data"
} as const;

const IMPORT_PREFIX_END = "/";

export const PYODIDE_MODULE_FILE = "pyodide.mjs";
export const PYODIDE_BASE_PACKAGES = ["pytest"] as const;

const filesSchema = z.record(z.string(), z.string());

export const runnerLessonSchema = z.object({
  id: z.string(),
  lang: z.enum(RunnableLang),
  timeoutSeconds: z.number().int().positive(),
  isDatabaseNeeded: z.boolean(),
  files: filesSchema
});

export const runnerKitSchema = z.object({
  importMap: z.record(z.string(), z.string()),
  setupFiles: z.array(z.string()),
  testTimeoutMs: z.number(),
  hookTimeoutMs: z.number(),
  tsFiles: filesSchema,
  pyFiles: filesSchema
});

export type RunnerLesson = z.infer<typeof runnerLessonSchema>;
export type RunnerKit = z.infer<typeof runnerKitSchema>;
export type LessonFiles = z.infer<typeof filesSchema>;

export function mapImport({ specifier, importMap }: {
  specifier: string;
  importMap: Record<string, string>;
}) {
  const exact = importMap[specifier];
  if (exact) {
    return exact;
  }

  for (const [prefix, target] of Object.entries(importMap)) {
    if (prefix.endsWith(IMPORT_PREFIX_END) && specifier.startsWith(prefix)) {
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
