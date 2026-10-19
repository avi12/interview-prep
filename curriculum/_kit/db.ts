import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { implPath } from "./impl.ts";

export const openDb = async (seedSql: string) => {
  const db = new PGlite();
  await db.exec(seedSql);
  return db;
};

export const readQueryFile = ({ testUrl, file }: { testUrl: string; file: string }) =>
  readFileSync(implPath({ testUrl, file }), "utf8").trim().replace(/;\s*$/, "");

export const runQueryFile = async ({ db, testUrl, file }: { db: PGlite; testUrl: string; file: string }) => {
  const { rows, fields } = await db.query<Record<string, unknown>>(readQueryFile({ testUrl, file }));
  return { rows, columns: fields.map(f => f.name) };
};
