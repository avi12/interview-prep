import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { implPath } from "./impl.ts";

export const SqlState = {
  notNull: "23502",
  restrict: "23001",
  foreignKey: "23503",
  unique: "23505",
  check: "23514"
} as const;

export const openSchemaDb = async ({ testUrl, file }: { testUrl: string; file: string }) => {
  const db = new PGlite();
  await db.exec(readFileSync(implPath({ testUrl, file }), "utf8"));
  return db;
};

export const tryStatement = async ({ db, sql, params = [] }: { db: PGlite; sql: string; params?: unknown[] }) => {
  try {
    await db.query(sql, params);
    return { isOk: true, code: null, message: "" };
  } catch (error) {
    const { code, message } = error as { code?: string; message: string };
    return { isOk: false, code: code ?? null, message };
  }
};
