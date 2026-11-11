import { z } from "@/lib/zod.ts";
import { RunnableLang } from "#scripts/lib/runner-bundle.ts";

export const HARNESS_STATE_KEY = "browserRunnerHarness";
export const HARNESS_DATA_FILE = "harness-data.json";
export const ONLY_PARAM = "only";
export const LANES_PARAM = "lanes";

export const Variant = {
  solution: "solution",
  starter: "starter",
  abortProbe: "abort-probe"
} as const;

const filesSchema = z.record(z.string(), z.string());

const harnessLessonSchema = z.object({
  id: z.string(),
  lang: z.enum(RunnableLang),
  starter: filesSchema,
  solution: filesSchema
});

export const harnessDataSchema = z.object({
  lessons: z.array(harnessLessonSchema),
  hangingFiles: z.partialRecord(
    z.enum(RunnableLang), z.object({
      lessonId: z.string(),
      files: filesSchema
    })
  )
});

const harnessRowSchema = z.object({
  id: z.string(),
  lang: z.string(),
  variant: z.enum(Variant),
  isPass: z.boolean(),
  isExpected: z.boolean(),
  isTimedOut: z.boolean(),
  passed: z.number(),
  total: z.number(),
  testCases: z.number(),
  queryResults: z.number(),
  ms: z.number(),
  problem: z.string()
});

export const harnessStateSchema = z.object({
  isDone: z.boolean(),
  rows: z.array(harnessRowSchema),
  fatal: z.string()
});

export type HarnessData = z.infer<typeof harnessDataSchema>;
export type HarnessLesson = z.infer<typeof harnessLessonSchema>;
export type HarnessRow = z.infer<typeof harnessRowSchema>;
export type HarnessState = z.infer<typeof harnessStateSchema>;
