import { testResultSchema } from "#scripts/lib/run-result.ts";
import { runnerLessonSchema } from "#scripts/lib/runner-bundle.ts";
import { zod } from "@/lib/zod.ts";

const filesSchema = zod.record(zod.string(), zod.string());

export const pyRunRequestSchema = zod.object({
  lesson: runnerLessonSchema,
  kitFiles: filesSchema,
  files: filesSchema
});

export const PyReply = {
  RESULT: "result",
  CRASH: "crash"
} as const;

export const pytestOutcomeSchema = zod.object({
  exitCode: zod.number().int(),
  output: zod.string(),
  tests: zod.array(testResultSchema),
  testCases: zod.array(zod.unknown())
});

export const pyRunResponseSchema = zod.discriminatedUnion("kind", [
  pytestOutcomeSchema.extend({ kind: zod.literal(PyReply.RESULT) }),
  zod.object({
    kind: zod.literal(PyReply.CRASH),
    message: zod.string()
  })
]);

export type PyRunRequest = zod.infer<typeof pyRunRequestSchema>;
export type PyRunResponse = zod.infer<typeof pyRunResponseSchema>;
