import { runSeeded } from "#kit/db.ts";
import { describe, expect, it } from "vitest";

const SCHEMA = `
CREATE TABLE visitors (visitor_id int PRIMARY KEY, channel text NOT NULL);
CREATE TABLE orders (order_id int PRIMARY KEY, visitor_id int NOT NULL REFERENCES visitors, amount int NOT NULL);`;

const SHOP = `${SCHEMA}
INSERT INTO visitors VALUES
  (1, 'email'), (2, 'email'), (3, 'email'), (4, 'email'),
  (5, 'search'), (6, 'search'), (7, 'search'), (8, 'search'), (9, 'search'), (10, 'search'),
  (11, 'social'), (12, 'social'), (13, 'social');
INSERT INTO orders VALUES (1, 1, 30), (2, 1, 20), (3, 2, 50), (4, 5, 40);`;

const STARTUP = `${SCHEMA}
INSERT INTO visitors VALUES
  (101, 'ads'), (102, 'ads'), (103, 'ads'), (104, 'ads'), (105, 'ads'), (106, 'ads'), (107, 'ads'), (108, 'ads'),
  (201, 'organic'), (202, 'organic'), (203, 'organic'),
  (301, 'referral'), (302, 'referral'), (303, 'referral'), (304, 'referral');
INSERT INTO orders VALUES
  (1, 101, 10), (2, 101, 10), (3, 102, 25), (4, 103, 5), (5, 103, 5),
  (6, 201, 15), (7, 201, 15), (8, 201, 15);`;

const NUMERIC_COLUMNS = ["conversion_rate"];

function run(seed: string) {
  return runSeeded({
    seed,
    testUrl: import.meta.url,
    file: "query.sql",
    numericColumns: NUMERIC_COLUMNS
  });
}

describe("conversion rate by channel", () => {
  it("returns channel, visitor_count, buyer_count, conversion_rate", async () => {
    const { columns } = await run(SHOP);
    expect(columns).toEqual(["channel", "visitor_count", "buyer_count", "conversion_rate"]);
  });

  it("counts people, not orders: a repeat buyer counts once", async () => {
    const { rows } = await run(SHOP);
    const email = rows.find(row => row.channel === "email");
    expect(email).toEqual({
      channel: "email",
      visitor_count: 4,
      buyer_count: 2,
      conversion_rate: 0.5
    });
  });

  it("keeps a channel with no buyers, at rate 0", async () => {
    const { rows } = await run(SHOP);
    expect(rows).toEqual([
      {
        channel: "email",
        visitor_count: 4,
        buyer_count: 2,
        conversion_rate: 0.5
      },
      {
        channel: "search",
        visitor_count: 6,
        buyer_count: 1,
        conversion_rate: 0.167
      },
      {
        channel: "social",
        visitor_count: 3,
        buyer_count: 0,
        conversion_rate: 0
      }
    ]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(STARTUP);
    expect(rows).toEqual([
      {
        channel: "ads",
        visitor_count: 8,
        buyer_count: 3,
        conversion_rate: 0.375
      },
      {
        channel: "organic",
        visitor_count: 3,
        buyer_count: 1,
        conversion_rate: 0.333
      },
      {
        channel: "referral",
        visitor_count: 4,
        buyer_count: 0,
        conversion_rate: 0
      }
    ]);
  });
});
