import { implPath } from "./impl.ts";
import { PGlite } from "@electric-sql/pglite";
import { z } from "#scripts/lib/zod.ts";
import { readFileSync } from "node:fs";

const postgresErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string()
});

export const SqlState = {
  notNull: "23502",
  restrict: "23001",
  foreignKey: "23503",
  unique: "23505",
  check: "23514"
} as const;

export async function openSchemaDb({ testUrl, file }: {
  testUrl: string;
  file: string;
}) {
  const db = new PGlite();
  await db.exec(
    readFileSync(
      implPath({
        testUrl,
        file
      }), "utf8"
    )
  );
  return db;
}

export async function tryStatement({ db, sql, params = [] }: {
  db: PGlite;
  sql: string;
  params?: unknown[];
}) {
  try {
    await db.query(sql, params);
    return {
      isOk: true,
      code: null,
      message: ""
    };
  } catch (error) {
    const { code, message } = postgresErrorSchema.parse(error);
    return {
      isOk: false,
      code: code ?? null,
      message
    };
  }
}
