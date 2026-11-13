import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PGlite } from "@electric-sql/pglite";

import type { Lesson } from "./lessons.ts";
import type { SqlTable } from "./schema.ts";

const CREATE_TABLE = /CREATE TABLE[\s\S]*?\);/gi;
const TESTS_DIR = "tests";
const RESET_SCHEMA = "DROP SCHEMA public CASCADE; CREATE SCHEMA public;";
const COLUMNS_QUERY = `SELECT table_name, column_name, data_type FROM information_schema.columns
  WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`;

function createTableStatements(lesson: Lesson) {
  const testsDir = resolve(lesson.dir, TESTS_DIR);
  if (!existsSync(testsDir)) {
    return [];
  }

  return readdirSync(testsDir, {
    recursive: true,
    withFileTypes: true
  })
    .filter(entry => entry.isFile())
    .flatMap(entry => readFileSync(resolve(entry.parentPath, entry.name), "utf8").match(CREATE_TABLE) ?? []);
}

function groupByTable(
  rows: {
    table_name: string;
    column_name: string;
    data_type: string;
  }[]
) {
  const tables = new Map<string, SqlTable>();
  for (const { table_name: tableName, column_name: columnName, data_type: dataType } of rows) {
    const table = tables.get(tableName) ?? {
      name: tableName,
      columns: []
    };
    table.columns.push({
      name: columnName,
      type: dataType
    });
    tables.set(tableName, table);
  }
  return [...tables.values()];
}

export async function createSqlSchemaReader() {
  const database = new PGlite();
  async function tablesOf(lesson: Lesson) {
    const statements = createTableStatements(lesson);
    if (statements.length === 0) {
      return [];
    }

    await database.exec(RESET_SCHEMA);
    for (const statement of new Set(statements)) {
      await database.exec(statement).catch(() => {});
    }
    const { rows } = await database.query<{
      table_name: string;
      column_name: string;
      data_type: string;
    }>(COLUMNS_QUERY);
    return groupByTable(rows);
  }
  return {
    tablesOf,
    close: () => database.close()
  };
}
