import { queryResultSchema } from "#scripts/lib/query-result.ts";
import { testCaseSchema } from "#scripts/lib/test-cases.ts";
import { z } from "#scripts/lib/zod.ts";

export const MS_PER_SECOND = 1000;
const TIMED_OUT_OUTPUT_TAIL_LENGTH = 500;

export const testResultSchema = z.object({
  name: z.string(),
  suite: z.array(z.string()),
  isPass: z.boolean(),
  message: z.string()
});

const runResultSchema = z.object({
  isPass: z.boolean(),
  isTimedOut: z.boolean(),
  output: z.string(),
  queryResults: z.array(queryResultSchema),
  testCases: z.array(testCaseSchema),
  tests: z.array(testResultSchema).optional()
});

export type TestResult = z.infer<typeof testResultSchema>;
export type RunResult = z.infer<typeof runResultSchema>;
export type BrowserRunResult = RunResult & { tests: TestResult[] };

function timeoutMessage(timeoutSeconds: number) {
  return `Stopped after ${timeoutSeconds} seconds. Something never finishes: look for a loop whose exit condition is never reached, or a recursion with no base case.`;
}

export function timedOutOutput({ timeoutSeconds, output }: {
  timeoutSeconds: number;
  output: string;
}) {
  return `${timeoutMessage(timeoutSeconds)}\n${output.slice(-TIMED_OUT_OUTPUT_TAIL_LENGTH)}`;
}
