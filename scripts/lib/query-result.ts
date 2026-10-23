import { QUERY_RESULTS_RELATIVE_DIR } from "#scripts/lib/layout.ts";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";

export const QUERY_RESULT_ENV = "QUERY_RESULT_FILE";
const MAX_SHOWN_ROWS = 20;
const NULL_CELL = "NULL";
const NUMERIC_CELL = /^-?\d+(\.\d+)?$/;
const CELL_PADDING = 2;
const TOP_EDGES = ["┌", "┬", "┐"] as const;
const MIDDLE_EDGES = ["├", "┼", "┤"] as const;
const BOTTOM_EDGES = ["└", "┴", "┘"] as const;

const queryResultSchema = z.object({
  file: z.string(),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string().nullable()))
});

type QueryResult = z.infer<typeof queryResultSchema>;

export function queryResultFileOf({ root, lessonId }: {
  root: string;
  lessonId: string;
}) {
  return resolve(root, QUERY_RESULTS_RELATIVE_DIR, `${lessonId}.jsonl`);
}

export function clearQueryResults(path: string) {
  rmSync(path, { force: true });
  mkdirSync(dirname(path), { recursive: true });
}

export function readQueryResults(path: string) {
  if (!existsSync(path)) {
    return [];
  }

  const firstByFile = new Map<string, QueryResult>();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line) {
      continue;
    }

    const result = queryResultSchema.parse(JSON.parse(line));
    if (!firstByFile.has(result.file)) {
      firstByFile.set(result.file, result);
    }
  }
  return [...firstByFile.values()];
}

function isNumericColumn({ rows, index }: {
  rows: string[][];
  index: number;
}) {
  const cells = rows.map(row => row[index]).filter(cell => cell !== NULL_CELL);
  return cells.length > 0 && cells.every(cell => NUMERIC_CELL.test(cell));
}

function rowCountText(count: number) {
  const rowsText = count === 1 ? "1 row" : `${count} rows`;
  return count > MAX_SHOWN_ROWS ? `${rowsText}, showing the first ${MAX_SHOWN_ROWS}` : rowsText;
}

function tableRule({ widths, edges: [left, middle, right] }: {
  widths: number[];
  edges: readonly [string, string, string];
}) {
  return `${left}${widths.map(width => "─".repeat(width + CELL_PADDING)).join(middle)}${right}`;
}

function tableLine({ cells, widths, isRightAligned }: {
  cells: string[];
  widths: number[];
  isRightAligned: boolean[];
}) {
  const padded = cells.map((cell, index) =>
    isRightAligned[index] ? cell.padStart(widths[index]) : cell.padEnd(widths[index]));
  return `│ ${padded.join(" │ ")} │`;
}

export function formatQueryResult({ file, columns, rows }: QueryResult) {
  const heading = `\nYour ${file} on the first test's data:`;
  if (columns.length === 0) {
    return `${heading} no columns returned`;
  }

  const shown = rows.slice(0, MAX_SHOWN_ROWS).map(row => row.map(cell => cell ?? NULL_CELL));
  const widths = columns.map((column, index) => Math.max(column.length, ...shown.map(row => row[index].length)));
  const isRightAligned = columns.map((_, index) => isNumericColumn({
    rows: shown,
    index
  }));
  return [
    heading,
    tableRule({
      widths,
      edges: TOP_EDGES
    }),
    tableLine({
      cells: columns,
      widths,
      isRightAligned
    }),
    tableRule({
      widths,
      edges: MIDDLE_EDGES
    }),
    ...shown.map(cells => tableLine({
      cells,
      widths,
      isRightAligned
    })),
    tableRule({
      widths,
      edges: BOTTOM_EDGES
    }),
    rowCountText(rows.length)
  ].join("\n");
}
