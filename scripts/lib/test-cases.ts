import { parseRecords } from "#scripts/lib/json.ts";
import { TEST_CASES_RELATIVE_DIR } from "#scripts/lib/layout.ts";
import { formatTable } from "#scripts/lib/text-table.ts";
import { zod } from "#scripts/lib/zod.ts";

const MAX_CELL_LENGTH = 40;
const CUT_MARK = "…";
const MISSING_CELL = "-";
const COLUMNS = [
  {
    title: "Test",
    key: "test"
  },
  {
    title: "Input",
    key: "input"
  },
  {
    title: "Expected",
    key: "expected"
  },
  {
    title: "Actual",
    key: "actual"
  }
] as const;

export const testCaseSchema = zod.object({
  test: zod.string(),
  isPass: zod.boolean(),
  input: zod.string().nullable(),
  expected: zod.string().nullable(),
  actual: zod.string().nullable()
});

export type TestCase = zod.infer<typeof testCaseSchema>;

export function testCasesRelativePath(lessonId: string) {
  return `${TEST_CASES_RELATIVE_DIR}/${lessonId}.jsonl`;
}

export function parseTestCases(text: string) {
  return parseRecords({
    text,
    schema: testCaseSchema
  });
}

function shortened(value: string) {
  return value.length > MAX_CELL_LENGTH ? `${value.slice(0, MAX_CELL_LENGTH - CUT_MARK.length)}${CUT_MARK}` : value;
}

function countText(count: number) {
  return count === 1 ? "1 test" : `${count} tests`;
}

export function failedCasesTable(cases: TestCase[]) {
  const failed = cases.filter(testCase => !testCase.isPass);
  const isPass = failed.length === 0;
  const hasInput = failed.some(({ input }) => input !== null);
  const columns = COLUMNS.filter(({ key }) => hasInput || key !== "input");
  return {
    summary: isPass ? `All ${countText(cases.length)} passed` : `${failed.length} of ${countText(cases.length)} failed`,
    isPass,
    columns: columns.map(({ title }) => title),
    rows: failed.map(testCase => columns.map(({ key }) => testCase[key] ?? MISSING_CELL))
  };
}

export function formatTestCases(cases: TestCase[]) {
  const { summary, isPass, columns, rows } = failedCasesTable(cases);
  if (isPass) {
    return summary;
  }

  return [
    `${summary}:`,
    ...formatTable({
      columns,
      rows: rows.map(row => row.map(shortened))
    })
  ].join("\n");
}
