import { PGlite } from "@electric-sql/pglite";
import { kitHost } from "#kit/host.ts";
import { implPath } from "#kit/impl.ts";
import { RecordKind } from "#scripts/lib/record-env.ts";

type Row = Record<string, unknown>;

const DAY_LENGTH = 10;
const MIDNIGHT_SUFFIX = / 00:00:00$/;
const ISO_ZONE_SUFFIX = /(\.000)?Z$/;

function cellText(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().replace("T", " ").replace(ISO_ZONE_SUFFIX, "").replace(MIDNIGHT_SUFFIX, "");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function recordQueryResult({ file, columns, rows }: {
  file: string;
  columns: string[];
  rows: Row[];
}) {
  kitHost.appendRecord({
    kind: RecordKind.queryResults,
    record: {
      file,
      columns,
      rows: rows.map(row => columns.map(column => cellText(row[column])))
    }
  });
}

export async function openDb(seedSql: string) {
  const db = new PGlite();
  await db.exec(seedSql);
  return db;
}

export function readQueryFile({ testUrl, file }: {
  testUrl: string;
  file: string;
}) {
  return kitHost.readText(
    implPath({
      testUrl,
      file
    })
  ).trim().replace(/;\s*$/, "");
}

export async function runQueryFile({ db, testUrl, file }: {
  db: PGlite;
  testUrl: string;
  file: string;
}) {
  const { rows, fields } = await db.query<Row>(
    readQueryFile({
      testUrl,
      file
    })
  );
  const columns = fields.map(field => field.name);
  recordQueryResult({
    file,
    columns,
    rows
  });
  return {
    rows,
    columns
  };
}

export function toDay(value: unknown) {
  return value instanceof Date ? value.toISOString().slice(0, DAY_LENGTH) : value;
}

function toNumberOrNull(value: unknown) {
  return value === null ? null : Number(value);
}

function normalizedValue({ column, value, numericColumns, dayColumns }: {
  column: string;
  value: unknown;
  numericColumns: string[];
  dayColumns: string[];
}) {
  if (numericColumns.includes(column)) {
    return toNumberOrNull(value);
  }

  if (dayColumns.includes(column)) {
    return toDay(value);
  }

  return value;
}

export async function runSeeded({
  seed,
  testUrl,
  file,
  numericColumns = [],
  dayColumns = []
}: {
  seed: string;
  testUrl: string;
  file: string;
  numericColumns?: string[];
  dayColumns?: string[];
}) {
  const db = await openDb(seed);
  const { rows, columns } = await runQueryFile({
    db,
    testUrl,
    file
  });
  const normalizedRows = rows.map(row =>
    Object.fromEntries(
      Object.entries(row).map(([column, value]) => [column, normalizedValue({
        column,
        value,
        numericColumns,
        dayColumns
      })])
    ));
  return {
    db,
    rows: normalizedRows,
    columns
  };
}
