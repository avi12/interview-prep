import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { implPath } from "./impl.ts";

type Row = Record<string, unknown>;

const DAY_LENGTH = 10;

export const openDb = async (seedSql: string) => {
  const db = new PGlite();
  await db.exec(seedSql);
  return db;
};

export const readQueryFile = ({ testUrl, file }: { testUrl: string; file: string }) =>
  readFileSync(implPath({ testUrl, file }), "utf8").trim().replace(/;\s*$/, "");

export const runQueryFile = async ({ db, testUrl, file }: { db: PGlite; testUrl: string; file: string }) => {
  const { rows, fields } = await db.query<Row>(readQueryFile({ testUrl, file }));
  return { rows, columns: fields.map(f => f.name) };
};

export const toDay = (value: unknown) => (value instanceof Date ? value.toISOString().slice(0, DAY_LENGTH) : value);

const toNumberOrNull = (value: unknown) => (value === null ? null : Number(value));

const normalizedValue = ({ column, value, numericColumns, dayColumns }: { column: string; value: unknown; numericColumns: string[]; dayColumns: string[] }) => {
  if (numericColumns.includes(column)) return toNumberOrNull(value);
  if (dayColumns.includes(column)) return toDay(value);
  return value;
};

export const runSeeded = async ({
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
}) => {
  const db = await openDb(seed);
  const { rows, columns } = await runQueryFile({ db, testUrl, file });
  const normalizedRows = rows.map(row =>
    Object.fromEntries(Object.entries(row).map(([column, value]) => [column, normalizedValue({ column, value, numericColumns, dayColumns })]))
  );
  return { db, rows: normalizedRows, columns };
};
