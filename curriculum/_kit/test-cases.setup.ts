import { afterEach, beforeEach } from "vitest";

import { clearLastCall, oneLine, readLastCall } from "#kit/calls.ts";
import { kitHost } from "#kit/host.ts";
import { RecordKind } from "#scripts/lib/record-env.ts";
import type { TestCase } from "#scripts/lib/test-cases.ts";

const FAIL_STATE = "fail";

function recordTestCase(testCase: TestCase) {
  kitHost.appendRecord({
    kind: RecordKind.TEST_CASES,
    record: testCase
  });
}

beforeEach(() => clearLastCall());

afterEach(({ task }) => {
  const call = readLastCall();
  const error = task.result?.errors?.[0];
  const hasComparison = error?.expected !== undefined && error.actual !== undefined;
  recordTestCase({
    test: task.name,
    isPass: task.result?.state !== FAIL_STATE,
    input: call,
    expected: hasComparison ? oneLine(error.expected) : null,
    actual: hasComparison ? oneLine(error.actual) : (error?.message ?? null)
  });
});
