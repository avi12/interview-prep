import { describe, expect, it } from "vitest";
import { openDb, runQueryFile } from "#kit/db.ts";

const SCHEMA = `CREATE TABLE logins (user_id int NOT NULL, logged_in_at timestamp NOT NULL);`;

const WEEK_OF_LOGINS = `${SCHEMA}
INSERT INTO logins VALUES
  (1, '2025-01-01 08:00'), (1, '2025-01-02 09:00'), (1, '2025-01-02 21:30'), (1, '2025-01-03 07:15'),
  (1, '2025-01-05 12:00'), (1, '2025-01-06 12:00'), (1, '2025-01-09 12:00'),
  (2, '2025-01-02 10:00'), (2, '2025-01-03 10:00'), (2, '2025-01-04 10:00'), (2, '2025-01-05 10:00'), (2, '2025-01-06 10:00'),
  (3, '2025-01-30 18:00'), (3, '2025-01-31 18:00'), (3, '2025-02-01 18:00'), (3, '2025-02-02 18:00');`;

const AROUND_MIDNIGHT = `${SCHEMA}
INSERT INTO logins VALUES
  (7, '2025-03-01 10:00'),
  (8, '2025-03-01 10:00'), (8, '2025-03-03 10:00'), (8, '2025-03-05 10:00'),
  (9, '2025-03-10 23:59'), (9, '2025-03-11 00:01'), (9, '2025-03-10 08:00'),
  (9, '2025-03-13 06:00'), (9, '2025-03-14 06:00'), (9, '2025-03-15 06:00');`;

const toDay = (value: unknown) => (value instanceof Date ? value.toISOString().slice(0, 10) : value);

const run = async (seed: string) => {
  const { rows, columns } = await runQueryFile({ db: await openDb(seed), testUrl: import.meta.url, file: "islands.sql" });
  const streaks = rows.map(row => ({
    user_id: Number(row.user_id),
    streak_start: toDay(row.streak_start),
    streak_end: toDay(row.streak_end),
    days: Number(row.days)
  }));
  return { columns, streaks };
};

describe("login streaks of consecutive days", () => {
  it("returns user_id, streak_start, streak_end, days", async () => {
    const { columns } = await run(WEEK_OF_LOGINS);
    expect(columns).toEqual(["user_id", "streak_start", "streak_end", "days"]);
  });

  it("splits at gaps, counts days not logins, and crosses a month end", async () => {
    const { streaks } = await run(WEEK_OF_LOGINS);
    expect(streaks).toEqual([
      { user_id: 1, streak_start: "2025-01-01", streak_end: "2025-01-03", days: 3 },
      { user_id: 1, streak_start: "2025-01-05", streak_end: "2025-01-06", days: 2 },
      { user_id: 1, streak_start: "2025-01-09", streak_end: "2025-01-09", days: 1 },
      { user_id: 2, streak_start: "2025-01-02", streak_end: "2025-01-06", days: 5 },
      { user_id: 3, streak_start: "2025-01-30", streak_end: "2025-02-02", days: 4 }
    ]);
  });

  it("uses calendar days, so logins two minutes apart across midnight are two days (no hardcoding)", async () => {
    const { streaks } = await run(AROUND_MIDNIGHT);
    expect(streaks).toEqual([
      { user_id: 7, streak_start: "2025-03-01", streak_end: "2025-03-01", days: 1 },
      { user_id: 8, streak_start: "2025-03-01", streak_end: "2025-03-01", days: 1 },
      { user_id: 8, streak_start: "2025-03-03", streak_end: "2025-03-03", days: 1 },
      { user_id: 8, streak_start: "2025-03-05", streak_end: "2025-03-05", days: 1 },
      { user_id: 9, streak_start: "2025-03-10", streak_end: "2025-03-11", days: 2 },
      { user_id: 9, streak_start: "2025-03-13", streak_end: "2025-03-15", days: 3 }
    ]);
  });
});
