import { PGlite } from "@electric-sql/pglite";

import { kitHost } from "#kit/host.ts";
import { implPath } from "#kit/impl.ts";
import { zod } from "#scripts/lib/zod.ts";

const postgresErrorSchema = zod.object({
  code: zod.string().optional(),
  message: zod.string()
});

export const SqlState = {
  NOT_NULL: "23502",
  RESTRICT: "23001",
  FOREIGN_KEY: "23503",
  UNIQUE: "23505",
  CHECK: "23514"
} as const;

export async function openSchemaDb({ testUrl, file }: { testUrl: string; file: string }) {
  const database = new PGlite();
  await database.exec(
    kitHost.readText(
      implPath({
        testUrl,
        file
      })
    )
  );
  return database;
}

export async function tryStatement({ db, sql, params = [] }: { db: PGlite; sql: string; params?: unknown[] }) {
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
