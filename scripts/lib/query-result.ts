import { parseRecords } from "#scripts/lib/json.ts";
import { QUERY_RESULTS_RELATIVE_DIR } from "#scripts/lib/layout.ts";
import { formatTable } from "#scripts/lib/text-table.ts";
import { zod } from "#scripts/lib/zod.ts";

const MAX_SHOWN_ROWS = 20;
const NULL_CELL = "NULL";
const NO_COLUMNS_TEXT = "no columns returned";
const NUMERIC_CELL = /^-?\d+(\.\d+)?$/;

export const queryResultSchema = zod.object({
  file: zod.string(),
  columns: zod.array(zod.string()),
  rows: zod.array(zod.array(zod.string().nullable()))
});

export type QueryResult = zod.infer<typeof queryResultSchema>;

export function queryResultsRelativePath(lessonId: string) {
  return `${QUERY_RESULTS_RELATIVE_DIR}/${lessonId}.jsonl`;
}

function firstResultPerFile(results: readonly QueryResult[]) {
  const firstByFile = new Map<string, QueryResult>();
  for (const result of results) {
    if (!firstByFile.has(result.file)) {
      firstByFile.set(result.file, result);
    }
  }
  return [...firstByFile.values()];
}

export function parseQueryResults(text: string) {
  return firstResultPerFile(
    parseRecords({
      text,
      schema: queryResultSchema
    })
  );
}

function isNumericColumn({ rows, index }: { rows: string[][]; index: number }) {
  const cells = rows.map(row => row[index]).filter(cell => cell !== NULL_CELL);
  return cells.length > 0 && cells.every(cell => NUMERIC_CELL.test(cell));
}

function rowCountText(count: number) {
  const rowsText = count === 1 ? "1 row" : `${count} rows`;
  return count > MAX_SHOWN_ROWS ? `${rowsText}, showing the first ${MAX_SHOWN_ROWS}` : rowsText;
}

export function queryResultTable({ file, columns, rows }: QueryResult) {
  const shown = rows.slice(0, MAX_SHOWN_ROWS).map(row => row.map(cell => cell ?? NULL_CELL));
  function isColumnNumeric(_: string, index: number) {
    return isNumericColumn({
      rows: shown,
      index
    });
  }
  return {
    heading: `Your ${file} on the first test's data`,
    columns,
    rows: shown,
    isRightAligned: columns.map(isColumnNumeric),
    countText: columns.length === 0 ? NO_COLUMNS_TEXT : rowCountText(rows.length)
  };
}

export function formatQueryResult(result: QueryResult) {
  const { heading, columns, rows, isRightAligned, countText } = queryResultTable(result);
  if (columns.length === 0) {
    return `\n${heading}: ${countText}`;
  }

  return [
    `\n${heading}:`,
    ...formatTable({
      columns,
      rows,
      isRightAligned
    }),
    countText
  ].join("\n");
}
