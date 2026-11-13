import { RunnableLang } from "#scripts/lib/runner-bundle.ts";
import { zod } from "@/lib/zod.ts";

export const HARNESS_STATE_KEY = "browserRunnerHarness";
export const HARNESS_DATA_FILE = "harness-data.json";
export const ONLY_PARAM = "only";
export const LANES_PARAM = "lanes";

export const Variant = {
  SOLUTION: "solution",
  STARTER: "starter",
  ABORT_PROBE: "abort-probe"
} as const;

const filesSchema = zod.record(zod.string(), zod.string());

const harnessLessonSchema = zod.object({
  id: zod.string(),
  lang: zod.enum(RunnableLang),
  starter: filesSchema,
  solution: filesSchema
});

export const harnessDataSchema = zod.object({
  lessons: zod.array(harnessLessonSchema),
  hangingFiles: zod.partialRecord(
    zod.enum(RunnableLang),
    zod.object({
      lessonId: zod.string(),
      files: filesSchema
    })
  )
});

const harnessRowSchema = zod.object({
  id: zod.string(),
  lang: zod.string(),
  variant: zod.enum(Variant),
  isPass: zod.boolean(),
  isExpected: zod.boolean(),
  isTimedOut: zod.boolean(),
  passed: zod.number(),
  total: zod.number(),
  testCases: zod.number(),
  queryResults: zod.number(),
  ms: zod.number(),
  problem: zod.string()
});

export const harnessStateSchema = zod.object({
  isDone: zod.boolean(),
  rows: zod.array(harnessRowSchema),
  fatal: zod.string()
});

export type HarnessData = zod.infer<typeof harnessDataSchema>;
export type HarnessLesson = zod.infer<typeof harnessLessonSchema>;
export type HarnessRow = zod.infer<typeof harnessRowSchema>;
export type HarnessState = zod.infer<typeof harnessStateSchema>;
