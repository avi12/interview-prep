const CELL_PADDING = 2;
const TOP_EDGES = ["┌", "┬", "┐"] as const;
const MIDDLE_EDGES = ["├", "┼", "┤"] as const;
const BOTTOM_EDGES = ["└", "┴", "┘"] as const;

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

export function formatTable({ columns, rows, isRightAligned = columns.map(() => false) }: {
  columns: string[];
  rows: string[][];
  isRightAligned?: boolean[];
}) {
  const widths = columns.map((column, index) => Math.max(column.length, ...rows.map(row => row[index].length)));
  return [
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
    ...rows.map(cells => tableLine({
      cells,
      widths,
      isRightAligned
    })),
    tableRule({
      widths,
      edges: BOTTOM_EDGES
    })
  ];
}
