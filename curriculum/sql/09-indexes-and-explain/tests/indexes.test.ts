import type { PGlite } from "@electric-sql/pglite";
import { openDb, readQueryFile } from "#kit/db.ts";
import { beforeAll, describe, expect, it } from "vitest";

const SEED = `
CREATE TABLE users (id int PRIMARY KEY, email text NOT NULL, created_at date NOT NULL);
INSERT INTO users
SELECT id, 'User' || id || '@Example.com', DATE '2024-01-01' + (id % 730)
FROM generate_series(1, 20000) AS id;
CREATE TABLE orders (id int PRIMARY KEY, customer_id int NOT NULL, status text NOT NULL, created_at date NOT NULL, total_cents int NOT NULL);
INSERT INTO orders
SELECT id, (id * 7919) % 2000 + 1, CASE WHEN id % 50 = 0 THEN 'refunded' ELSE 'paid' END, DATE '2024-01-01' + (id % 730), (id % 500) * 100
FROM generate_series(1, 20000) AS id;`;

const MAX_EXTRA_INDEXES = 2;

const EMAIL_LOOKUP = "SELECT * FROM users WHERE lower(email) = 'user777@example.com'";
const CUSTOMER_LOOKUP = "SELECT * FROM orders WHERE customer_id = 42";
const CUSTOMER_SINCE = "SELECT * FROM orders WHERE customer_id = 42 AND created_at >= DATE '2025-01-01'";

type PlanNode = {
  "Node Type": string;
  Plans?: PlanNode[];
};

function nodeTypesOf(node: PlanNode): string[] {
  return [node["Node Type"], ...(node.Plans ?? []).flatMap(nodeTypesOf)];
}

let db: PGlite;

beforeAll(async () => {
  db = await openDb(SEED);
  await db.exec(
    readQueryFile({
      testUrl: import.meta.url,
      file: "setup.sql"
    })
  );
  await db.exec("ANALYZE");
});

async function planOf(sql: string) {
  const { rows } = await db.query<{ "QUERY PLAN": [{ Plan: PlanNode }] }>(`EXPLAIN (FORMAT JSON) ${sql}`);
  return nodeTypesOf(rows[0]["QUERY PLAN"][0].Plan);
}

async function expectIndexUsed(sql: string) {
  const nodeTypes = await planOf(sql);
  const isIndexUsed = nodeTypes.some(type => type.includes("Index"));
  expect(isIndexUsed, `no index used, the plan was: ${nodeTypes.join(" > ")}`).toBe(true);
}

async function createdIndexes() {
  const { rows } = await db.query<{ indexdef: string }>(
    "SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'"
  );
  return rows.map(row => row.indexdef);
}

describe("indexes chosen from the query plan", () => {
  it("looks up a user by lower(email) with an index (the index must be on the expression)", async () => {
    await expectIndexUsed(EMAIL_LOOKUP);
  });

  it("looks up orders by customer_id with an index", async () => {
    await expectIndexUsed(CUSTOMER_LOOKUP);
  });

  it("looks up one customer's recent orders with an index", async () => {
    await expectIndexUsed(CUSTOMER_SINCE);
  });

  it("creates no index on status, which matches 98 percent of rows and would be ignored", async () => {
    const definitions = await createdIndexes();
    expect(definitions.filter(definition => /\(status\b/.test(definition))).toEqual([]);
  });

  it(`needs at most ${MAX_EXTRA_INDEXES} indexes: one composite index serves both orders queries`, async () => {
    const definitions = await createdIndexes();
    expect(definitions.length, `indexes: ${definitions.join(" | ")}`).toBeLessThanOrEqual(MAX_EXTRA_INDEXES);
  });
});
