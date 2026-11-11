import { z } from "@/lib/zod.ts";
import { testResultSchema } from "#scripts/lib/run-result.ts";
import { runnerLessonSchema } from "#scripts/lib/runner-bundle.ts";

const filesSchema = z.record(z.string(), z.string());

export const pyRunRequestSchema = z.object({
  lesson: runnerLessonSchema,
  kitFiles: filesSchema,
  files: filesSchema
});

export const PyReply = {
  result: "result",
  crash: "crash"
} as const;

export const pytestOutcomeSchema = z.object({
  exitCode: z.number().int(),
  output: z.string(),
  tests: z.array(testResultSchema),
  testCases: z.array(z.unknown())
});

export const pyRunResponseSchema = z.discriminatedUnion("kind", [
  pytestOutcomeSchema.extend({ kind: z.literal(PyReply.result) }),
  z.object({
    kind: z.literal(PyReply.crash),
    message: z.string()
  })
]);

export type PyRunRequest = z.infer<typeof pyRunRequestSchema>;
export type PyRunResponse = z.infer<typeof pyRunResponseSchema>;
