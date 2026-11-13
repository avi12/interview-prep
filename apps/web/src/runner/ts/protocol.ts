import { RecordKind } from "#scripts/lib/record-env.ts";
import { testResultSchema } from "#scripts/lib/run-result.ts";
import { zod } from "@/lib/zod.ts";

export const FILE_URL_PREFIX = "file://";

const filesSchema = zod.record(zod.string(), zod.string());

export const runRequestSchema = zod.object({
  files: filesSchema,
  testFiles: zod.array(zod.string()),
  setupFiles: zod.array(zod.string()),
  implDir: zod.string(),
  importMap: zod.record(zod.string(), zod.string()),
  testTimeoutMs: zod.number(),
  hookTimeoutMs: zod.number(),
  isRecording: zod.boolean()
});

export const WorkerReply = {
  RESULT: "result",
  CRASH: "crash"
} as const;

export const runResponseSchema = zod.discriminatedUnion("kind", [
  zod.object({
    kind: zod.literal(WorkerReply.RESULT),
    tests: zod.array(testResultSchema),
    errors: zod.array(zod.string()),
    records: zod.record(zod.enum(RecordKind), zod.array(zod.unknown()))
  }),
  zod.object({
    kind: zod.literal(WorkerReply.CRASH),
    message: zod.string()
  })
]);

export type RunRequest = zod.infer<typeof runRequestSchema>;
export type RunResponse = zod.infer<typeof runResponseSchema>;
