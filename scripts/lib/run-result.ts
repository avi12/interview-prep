import { queryResultSchema } from "#scripts/lib/query-result.ts";
import { testCaseSchema } from "#scripts/lib/test-cases.ts";
import { zod } from "#scripts/lib/zod.ts";

export const MS_PER_SECOND = 1000;
const TIMED_OUT_OUTPUT_TAIL_LENGTH = 500;

export const testResultSchema = zod.object({
  name: zod.string(),
  suite: zod.array(zod.string()),
  isPass: zod.boolean(),
  message: zod.string()
});

const runResultSchema = zod.object({
  isPass: zod.boolean(),
  isTimedOut: zod.boolean(),
  output: zod.string(),
  queryResults: zod.array(queryResultSchema),
  testCases: zod.array(testCaseSchema),
  tests: zod.array(testResultSchema).optional()
});

export type TestResult = zod.infer<typeof testResultSchema>;
export type RunResult = zod.infer<typeof runResultSchema>;
export type BrowserRunResult = RunResult & { tests: TestResult[] };

function timeoutMessage(timeoutSeconds: number) {
  return `Stopped after ${timeoutSeconds} seconds. Something never finishes: look for a loop whose exit condition is never reached, or a recursion with no base case.`;
}

export function timedOutOutput({ timeoutSeconds, output }: { timeoutSeconds: number; output: string }) {
  return `${timeoutMessage(timeoutSeconds)}\n${output.slice(-TIMED_OUT_OUTPUT_TAIL_LENGTH)}`;
}
