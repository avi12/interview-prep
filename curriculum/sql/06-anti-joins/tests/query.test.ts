import { describe, expect, it } from "vitest";
import { runSeeded } from "#kit/db.ts";

const SCHEMA = `
CREATE TABLE customers (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE orders (id int PRIMARY KEY, customer_id int REFERENCES customers (id), status text NOT NULL);`;

const SHOP = `${SCHEMA}
INSERT INTO customers VALUES (1, 'Ava'), (2, 'Ben'), (3, 'Cleo'), (4, 'Dan'), (5, 'Eve');
INSERT INTO orders VALUES
  (1, 1, 'paid'),
  (2, 2, 'cancelled'),
  (3, 3, 'paid'),
  (4, 3, 'refunded'),
  (5, NULL, 'paid');`;

const CAFE = `${SCHEMA}
INSERT INTO customers VALUES (10, 'Fay'), (11, 'Gil'), (12, 'Hana'), (13, 'Ivo');
INSERT INTO orders VALUES
  (1, 10, 'paid'),
  (2, 10, 'paid'),
  (3, 11, 'pending'),
  (4, NULL, 'paid'),
  (5, NULL, 'cancelled'),
  (6, 12, 'cancelled');`;

const run = (seed: string) => runSeeded({ seed, testUrl: import.meta.url, file: "query.sql" });

describe("customers with no paid order", () => {
  it("returns the columns id, name", async () => {
    const { columns } = await run(SHOP);
    expect(columns).toEqual(["id", "name"]);
  });

  it("still returns rows when some orders have a NULL customer_id (the NOT IN trap)", async () => {
    const { rows } = await run(SHOP);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("keeps a customer whose only orders are cancelled (the paid test belongs to the match)", async () => {
    const { rows } = await run(SHOP);
    expect(rows.map(row => row.name)).toContain("Ben");
  });

  it("drops a customer who has a paid order next to a refunded one", async () => {
    const { rows } = await run(SHOP);
    expect(rows.map(row => row.name)).not.toContain("Cleo");
  });

  it("returns each customer once, sorted by id", async () => {
    const { rows } = await run(SHOP);
    expect(rows).toEqual([
      { id: 2, name: "Ben" },
      { id: 4, name: "Dan" },
      { id: 5, name: "Eve" }
    ]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(CAFE);
    expect(rows).toEqual([
      { id: 11, name: "Gil" },
      { id: 12, name: "Hana" },
      { id: 13, name: "Ivo" }
    ]);
  });
});
