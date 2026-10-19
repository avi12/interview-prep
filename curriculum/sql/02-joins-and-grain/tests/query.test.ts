import { describe, expect, it } from "vitest";
import { openDb, runQueryFile } from "#kit/db.ts";

const SCHEMA = `
CREATE TABLE customers (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE orders (id int PRIMARY KEY, customer_id int NOT NULL REFERENCES customers (id), total int NOT NULL);
CREATE TABLE order_items (id int PRIMARY KEY, order_id int NOT NULL REFERENCES orders (id), sku text NOT NULL, quantity int NOT NULL);`;

const SHOP = `${SCHEMA}
INSERT INTO customers VALUES (1, 'Ava'), (2, 'Ben'), (3, 'Cleo'), (4, 'Dan');
INSERT INTO orders VALUES (1, 1, 40), (2, 1, 25), (3, 2, 60), (4, 3, 30);
INSERT INTO order_items VALUES
  (1, 1, 'pen', 2), (2, 1, 'ink', 1), (3, 1, 'pad', 4),
  (4, 2, 'pen', 3),
  (5, 3, 'cup', 1), (6, 3, 'mug', 1);`;

const CAFE = `${SCHEMA}
INSERT INTO customers VALUES (1, 'Eli'), (2, 'Fay'), (5, 'Gus'), (7, 'Hana');
INSERT INTO orders VALUES (10, 1, 12), (11, 1, 12), (12, 2, 50), (13, 2, 5);
INSERT INTO order_items VALUES
  (1, 10, 'tea', 2), (2, 10, 'cake', 1),
  (3, 11, 'tea', 1), (4, 11, 'cake', 1), (5, 11, 'jam', 1),
  (6, 12, 'beans', 5);`;

const NUMERIC_COLUMNS = ["revenue", "units"];

const withNumbers = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).map(([column, value]) => [column, NUMERIC_COLUMNS.includes(column) ? Number(value) : value]));

const run = async (seed: string) => {
  const { rows, columns } = await runQueryFile({ db: await openDb(seed), testUrl: import.meta.url, file: "query.sql" });
  return { rows: rows.map(withNumbers), columns };
};

const rowFor = ({ rows, name }: { rows: Record<string, unknown>[]; name: string }) => rows.find(row => row.name === name);

describe("revenue and units per customer", () => {
  it("returns the columns name, revenue, units", async () => {
    const { columns } = await run(SHOP);
    expect(columns).toEqual(["name", "revenue", "units"]);
  });

  it("does not multiply an order total by its number of items (fan-out)", async () => {
    const { rows } = await run(SHOP);
    expect(rowFor({ rows, name: "Ava" })).toEqual({ name: "Ava", revenue: 65, units: 10 });
  });

  it("keeps an order that has no items, with 0 units", async () => {
    const { rows } = await run(SHOP);
    expect(rowFor({ rows, name: "Cleo" })).toEqual({ name: "Cleo", revenue: 30, units: 0 });
  });

  it("keeps customers with no orders, with 0 revenue and 0 units (LEFT JOIN)", async () => {
    const { rows } = await run(SHOP);
    expect(rowFor({ rows, name: "Dan" })).toEqual({ name: "Dan", revenue: 0, units: 0 });
  });

  it("counts two different orders that happen to have the same total twice", async () => {
    const { rows } = await run(CAFE);
    expect(rowFor({ rows, name: "Eli" })).toEqual({ name: "Eli", revenue: 24, units: 6 });
  });

  it("returns the full report sorted by revenue, then name", async () => {
    const { rows } = await run(SHOP);
    expect(rows).toEqual([
      { name: "Ava", revenue: 65, units: 10 },
      { name: "Ben", revenue: 60, units: 2 },
      { name: "Cleo", revenue: 30, units: 0 },
      { name: "Dan", revenue: 0, units: 0 }
    ]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(CAFE);
    expect(rows).toEqual([
      { name: "Fay", revenue: 55, units: 5 },
      { name: "Eli", revenue: 24, units: 6 },
      { name: "Gus", revenue: 0, units: 0 },
      { name: "Hana", revenue: 0, units: 0 }
    ]);
  });
});
