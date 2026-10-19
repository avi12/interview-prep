import { describe, expect, it } from "vitest";
import { openDb, runQueryFile } from "#kit/db.ts";

const SCHEMA = `
CREATE TABLE support_tickets (
  id int PRIMARY KEY,
  agent text NOT NULL,
  status text NOT NULL,
  escalated_to text,
  minutes_to_resolve int,
  rating int
);`;

const TEAM_A = `${SCHEMA}
INSERT INTO support_tickets VALUES
  (1, 'Maya', 'closed', NULL, 30, 5),
  (2, 'Maya', 'closed', 'tier2', 45, 4),
  (3, 'Maya', 'closed', 'legal', 90, 1),
  (4, 'Maya', 'open', NULL, NULL, NULL),
  (5, 'Noam', 'closed', NULL, 20, NULL),
  (6, 'Noam', 'closed', NULL, NULL, NULL),
  (7, 'Omer', 'closed', NULL, 50, 3),
  (8, 'Pia', 'closed', NULL, 10, 5),
  (9, 'Pia', 'open', 'tier2', NULL, NULL),
  (10, 'Noam', 'closed', 'legal', 60, 2),
  (11, 'Omer', 'closed', NULL, 40, NULL),
  (12, 'Quinn', 'closed', NULL, NULL, 2),
  (13, 'Quinn', 'closed', NULL, NULL, 3);`;

const TEAM_B = `${SCHEMA}
INSERT INTO support_tickets VALUES
  (1, 'Rina', 'closed', NULL, 10, 5),
  (2, 'Rina', 'closed', NULL, 20, 4),
  (3, 'Rina', 'closed', 'tier2', 30, 4),
  (4, 'Rina', 'closed', 'legal', 15, 1),
  (5, 'Sam', 'closed', NULL, 25, 3),
  (6, 'Sam', 'open', NULL, NULL, NULL),
  (7, 'Sam', 'open', 'tier2', NULL, NULL),
  (8, 'Tali', 'closed', 'tier2', NULL, NULL),
  (9, 'Tali', 'closed', 'tier2', 15, NULL),
  (10, 'Uri', 'closed', 'legal', 5, 2),
  (11, 'Uri', 'closed', 'legal', 8, 3);`;

const withNumbers = (row: Record<string, unknown>): Record<string, unknown> => ({
  ...row,
  avg_rating: row.avg_rating === null ? null : Number(row.avg_rating)
});

const run = async (seed: string) => {
  const { rows, columns } = await runQueryFile({ db: await openDb(seed), testUrl: import.meta.url, file: "query.sql" });
  return { rows: rows.map(withNumbers), columns };
};

const rowFor = ({ rows, agent }: { rows: Record<string, unknown>[]; agent: string }) => rows.find(row => row.agent === agent);

describe("closed ticket report per agent", () => {
  it("returns the columns agent, tickets, rated, avg_rating, total_minutes", async () => {
    const { columns } = await run(TEAM_A);
    expect(columns).toEqual(["agent", "tickets", "rated", "avg_rating", "total_minutes"]);
  });

  it("keeps tickets that were never escalated (NULL is not <> 'legal')", async () => {
    const { rows } = await run(TEAM_A);
    expect(rowFor({ rows, agent: "Maya" })?.tickets).toBe(2);
  });

  it("COUNT(rating) skips unrated tickets while COUNT(*) counts them", async () => {
    const { rows } = await run(TEAM_A);
    expect(rowFor({ rows, agent: "Omer" })).toMatchObject({ tickets: 2, rated: 1 });
  });

  it("AVG ignores unrated tickets instead of treating them as 0", async () => {
    const { rows } = await run(TEAM_A);
    expect(rowFor({ rows, agent: "Omer" })?.avg_rating).toBe(3);
  });

  it("avg_rating stays NULL when nobody rated", async () => {
    const { rows } = await run(TEAM_A);
    expect(rowFor({ rows, agent: "Noam" })).toMatchObject({ rated: 0, avg_rating: null });
  });

  it("total_minutes is 0, not NULL, when no minutes were recorded", async () => {
    const { rows } = await run(TEAM_A);
    expect(rowFor({ rows, agent: "Quinn" })?.total_minutes).toBe(0);
  });

  it("leaves out agents with fewer than 2 qualifying tickets (HAVING)", async () => {
    const { rows } = await run(TEAM_A);
    expect(rows.map(row => row.agent)).toEqual(["Maya", "Noam", "Omer", "Quinn"]);
  });

  it("returns the full report for the first team", async () => {
    const { rows } = await run(TEAM_A);
    expect(rows).toEqual([
      { agent: "Maya", tickets: 2, rated: 2, avg_rating: 4.5, total_minutes: 75 },
      { agent: "Noam", tickets: 2, rated: 0, avg_rating: null, total_minutes: 20 },
      { agent: "Omer", tickets: 2, rated: 1, avg_rating: 3, total_minutes: 90 },
      { agent: "Quinn", tickets: 2, rated: 2, avg_rating: 2.5, total_minutes: 0 }
    ]);
  });

  it("works on different data too, rounding to 1 decimal (no hardcoding)", async () => {
    const { rows } = await run(TEAM_B);
    expect(rows).toEqual([
      { agent: "Rina", tickets: 3, rated: 3, avg_rating: 4.3, total_minutes: 60 },
      { agent: "Tali", tickets: 2, rated: 0, avg_rating: null, total_minutes: 15 }
    ]);
  });
});
