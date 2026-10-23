import { readQueryFile, runSeeded } from "#kit/db.ts";
import { describe, expect, it } from "vitest";

const SCHEMA = `CREATE TABLE payments (id int PRIMARY KEY, customer text NOT NULL, amount int NOT NULL);`;

const SHOP = `${SCHEMA}
INSERT INTO payments VALUES
  (1, 'Ada', 70), (2, 'Ada', 50),
  (3, 'Bo', 80),
  (4, 'Cy', 10), (5, 'Cy', 10), (6, 'Cy', 10),
  (7, 'Di', 30), (8, 'Di', 30),
  (9, 'Eli', 10);`;

const CAFE = `${SCHEMA}
INSERT INTO payments VALUES
  (1, 'Fox', 100), (2, 'Fox', 100),
  (3, 'Gil', 30), (4, 'Gil', 30), (5, 'Gil', 30),
  (6, 'Hal', 70),
  (7, 'Ivy', 20), (8, 'Ivy', 20),
  (9, 'Jon', 10);`;

const MIN_CTE_COUNT = 2;
const CTE_DEFINITION = /\b\w+\s+AS\s*\(/gi;

function run(seed: string) {
  return runSeeded({
    seed,
    testUrl: import.meta.url,
    file: "query.sql"
  });
}

describe("customers above the average customer total", () => {
  it("is written as two chained CTEs: WITH first AS (...), second AS (...)", () => {
    const query = readQueryFile({
      testUrl: import.meta.url,
      file: "query.sql"
    });
    const definitions = query.match(CTE_DEFINITION) ?? [];
    expect(query).toMatch(/^\s*WITH\b/i);
    expect(definitions.length).toBeGreaterThanOrEqual(MIN_CTE_COUNT);
  });

  it("returns the columns customer, total", async () => {
    const { columns } = await run(SHOP);
    expect(columns).toEqual(["customer", "total"]);
  });

  it("averages per customer, not per payment (grain)", async () => {
    const { rows } = await run(SHOP);
    expect(rows.map(row => row.customer)).not.toContain("Di");
  });

  it("uses a strict comparison: a customer exactly at the average is left out", async () => {
    const { rows } = await run(SHOP);
    expect(rows).toEqual([
      {
        customer: "Ada",
        total: 120
      },
      {
        customer: "Bo",
        total: 80
      }
    ]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(CAFE);
    expect(rows).toEqual([
      {
        customer: "Fox",
        total: 200
      },
      {
        customer: "Gil",
        total: 90
      }
    ]);
  });
});
