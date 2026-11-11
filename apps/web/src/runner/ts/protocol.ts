import { z } from "@/lib/zod.ts";
import { RecordKind } from "#scripts/lib/record-env.ts";
import { testResultSchema } from "#scripts/lib/run-result.ts";

export const FILE_URL_PREFIX = "file://";

const filesSchema = z.record(z.string(), z.string());

export const runRequestSchema = z.object({
  files: filesSchema,
  testFiles: z.array(z.string()),
  setupFiles: z.array(z.string()),
  implDir: z.string(),
  importMap: z.record(z.string(), z.string()),
  testTimeoutMs: z.number(),
  hookTimeoutMs: z.number(),
  isRecording: z.boolean()
});

export const WorkerReply = {
  result: "result",
  crash: "crash"
} as const;

export const runResponseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal(WorkerReply.result),
    tests: z.array(testResultSchema),
    errors: z.array(z.string()),
    records: z.record(z.enum(RecordKind), z.array(z.unknown()))
  }),
  z.object({
    kind: z.literal(WorkerReply.crash),
    message: z.string()
  })
]);

export type RunRequest = z.infer<typeof runRequestSchema>;
export type RunResponse = z.infer<typeof runResponseSchema>;
