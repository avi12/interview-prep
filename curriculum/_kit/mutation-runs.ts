import type { SuiteOutcome } from "#kit/host-contract.ts";

export const SuiteTestStatus = {
  passed: "passed",
  failed: "failed",
  skipped: "skipped"
} as const;

type SuiteTestStatusName = typeof SuiteTestStatus[keyof typeof SuiteTestStatus];

export type SuiteTest = {
  title: string;
  status: SuiteTestStatusName;
  message: string;
};

export const MAX_CRASH_CHARS = 1200;
const MAX_FAILURE_LINES = 6;
const STACK_LINE = /^\s+at /;

function messageWithoutStack(text: string) {
  const lines = text.split("\n");
  const stackStart = lines.findIndex(line => STACK_LINE.test(line));
  return lines.slice(0, stackStart === -1 ? lines.length : stackStart).slice(0, MAX_FAILURE_LINES).join(" | ");
}

export function crashOutcome(output: string) {
  return {
    isPass: false,
    passedTitles: [],
    failures: [],
    crash: output.slice(-MAX_CRASH_CHARS)
  } satisfies SuiteOutcome;
}

export function suiteOutcomeOf({ tests, crash }: {
  tests: SuiteTest[];
  crash: string;
}) {
  const passedTitles = tests.filter(({ status }) => status === SuiteTestStatus.passed).map(({ title }) => title);
  const failures = tests
    .filter(({ status }) => status === SuiteTestStatus.failed)
    .map(({ title, message }) => `"${title}" failed: ${messageWithoutStack(message)}`);
  const shownCrash = crash.slice(0, MAX_CRASH_CHARS);
  return {
    isPass: failures.length === 0 && shownCrash === "" && passedTitles.length > 0,
    passedTitles,
    failures,
    crash: shownCrash
  } satisfies SuiteOutcome;
}

export const MAX_PARALLEL_RUNS = 4;
export const RUN_TIMEOUT_MS = 90_000;

export async function mapWithLimit<T, R>({ items, limit, work }: {
  items: T[];
  limit: number;
  work: (item: T) => Promise<R>;
}) {
  const results: R[] = [];
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}
