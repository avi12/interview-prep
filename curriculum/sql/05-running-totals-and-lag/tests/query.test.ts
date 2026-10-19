import { describe, expect, it } from "vitest";
import { openDb, runQueryFile } from "#kit/db.ts";

const SCHEMA = `CREATE TABLE payments (id int PRIMARY KEY, paid_on date NOT NULL, amount int NOT NULL);`;

const JANUARY = `${SCHEMA}
INSERT INTO payments VALUES
  (1, '2026-01-01', 100),
  (2, '2026-01-02', 50),
  (3, '2026-01-02', 25),
  (4, '2026-01-02', -10),
  (5, '2026-01-05', 40);`;

const MARCH = `${SCHEMA}
INSERT INTO payments VALUES
  (5, '2026-03-10', 20),
  (2, '2026-03-10', 20),
  (4, '2026-03-11', 15),
  (1, '2026-03-15', 5),
  (6, '2026-03-15', 30),
  (3, '2026-03-15', 10);`;

const DATE_LENGTH = 10;

const withPlainDate = (row: Record<string, unknown>) => ({
  ...row,
  paid_on: row.paid_on instanceof Date ? row.paid_on.toISOString().slice(0, DATE_LENGTH) : row.paid_on
});

const run = async (seed: string) => {
  const { rows, columns } = await runQueryFile({ db: await openDb(seed), testUrl: import.meta.url, file: "query.sql" });
  return { rows: rows.map(withPlainDate), columns };
};

const columnOf = ({ rows, column }: { rows: Record<string, unknown>[]; column: string }) => rows.map(row => row[column]);

describe("ledger with running total and change", () => {
  it("returns the columns id, paid_on, amount, running_total, change", async () => {
    const { columns } = await run(JANUARY);
    expect(columns).toEqual(["id", "paid_on", "amount", "running_total", "change"]);
  });

  it("adds payments from the same day one at a time (ROWS frame, not RANGE peers)", async () => {
    const { rows } = await run(JANUARY);
    expect(columnOf({ rows, column: "running_total" })).toEqual([100, 150, 175, 165, 205]);
  });

  it("change is NULL on the very first payment, then amount minus the previous amount", async () => {
    const { rows } = await run(JANUARY);
    expect(columnOf({ rows, column: "change" })).toEqual([null, -50, -25, -35, 50]);
  });

  it("orders ties by id, even when ids are not in date order", async () => {
    const { rows } = await run(MARCH);
    expect(columnOf({ rows, column: "id" })).toEqual([2, 5, 4, 1, 3, 6]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(MARCH);
    expect(rows).toEqual([
      { id: 2, paid_on: "2026-03-10", amount: 20, running_total: 20, change: null },
      { id: 5, paid_on: "2026-03-10", amount: 20, running_total: 40, change: 0 },
      { id: 4, paid_on: "2026-03-11", amount: 15, running_total: 55, change: -5 },
      { id: 1, paid_on: "2026-03-15", amount: 5, running_total: 60, change: -10 },
      { id: 3, paid_on: "2026-03-15", amount: 10, running_total: 70, change: 5 },
      { id: 6, paid_on: "2026-03-15", amount: 30, running_total: 100, change: 20 }
    ]);
  });
});
