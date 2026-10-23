import { runSeeded } from "#kit/db.ts";
import { describe, expect, it } from "vitest";

const SCHEMA = `
CREATE TABLE users (id int PRIMARY KEY, signed_up_at date NOT NULL);
CREATE TABLE events (user_id int NOT NULL REFERENCES users (id), event_date date NOT NULL);`;

const JANUARY_SIGNUPS = `${SCHEMA}
INSERT INTO users VALUES
  (1, '2025-01-06'), (2, '2025-01-07'), (3, '2025-01-09'), (4, '2025-01-12'),
  (5, '2025-01-13'), (6, '2025-01-15'), (7, '2025-01-16'),
  (8, '2025-01-20'), (9, '2025-01-21');
INSERT INTO events VALUES
  (1, '2025-01-06'), (1, '2025-01-14'), (1, '2025-01-15'),
  (2, '2025-01-07'), (2, '2025-01-08'),
  (3, '2025-01-09'), (3, '2025-01-20'),
  (4, '2025-01-13'), (4, '2025-01-13'),
  (5, '2025-01-13'), (5, '2025-01-21'),
  (6, '2025-01-15'), (6, '2025-01-22'), (6, '2025-01-23'),
  (7, '2025-01-16'),
  (8, '2025-01-20'),
  (9, '2025-01-21');`;

const YEAR_BOUNDARY = `${SCHEMA}
INSERT INTO users VALUES
  (1, '2024-12-30'), (2, '2024-12-31'), (3, '2025-01-02'),
  (4, '2025-01-06'), (5, '2025-01-08'), (6, '2025-01-10'), (7, '2025-01-11'),
  (8, '2025-01-13'), (9, '2025-01-13'), (10, '2025-01-14');
INSERT INTO events VALUES
  (1, '2025-01-06'),
  (2, '2025-01-07'), (2, '2025-01-09'),
  (3, '2024-12-31'),
  (4, '2025-01-14'), (5, '2025-01-15'), (6, '2025-01-16'), (7, '2025-01-18'),
  (8, '2025-01-21'),
  (9, '2025-01-27');`;

const NUMERIC_COLUMNS = ["users", "retained_week_1", "retention_pct"];
const DAY_COLUMNS = ["cohort_week"];

function run(seed: string) {
  return runSeeded({
    seed,
    testUrl: import.meta.url,
    file: "retention.sql",
    numericColumns: NUMERIC_COLUMNS,
    dayColumns: DAY_COLUMNS
  });
}

describe("week 1 retention by signup week", () => {
  it("returns cohort_week, users, retained_week_1, retention_pct", async () => {
    const { columns } = await run(JANUARY_SIGNUPS);
    expect(columns).toEqual(["cohort_week", "users", "retained_week_1", "retention_pct"]);
  });

  it("counts people once and keeps a cohort nobody came back to", async () => {
    const { rows: cohorts } = await run(JANUARY_SIGNUPS);
    expect(cohorts).toEqual([
      {
        cohort_week: "2025-01-06",
        users: 4,
        retained_week_1: 2,
        retention_pct: 50
      },
      {
        cohort_week: "2025-01-13",
        users: 3,
        retained_week_1: 2,
        retention_pct: 66.7
      },
      {
        cohort_week: "2025-01-20",
        users: 2,
        retained_week_1: 0,
        retention_pct: 0
      }
    ]);
  });

  it("works across a year boundary and ignores week 2 activity (no hardcoding)", async () => {
    const { rows: cohorts } = await run(YEAR_BOUNDARY);
    expect(cohorts).toEqual([
      {
        cohort_week: "2024-12-30",
        users: 3,
        retained_week_1: 2,
        retention_pct: 66.7
      },
      {
        cohort_week: "2025-01-06",
        users: 4,
        retained_week_1: 4,
        retention_pct: 100
      },
      {
        cohort_week: "2025-01-13",
        users: 3,
        retained_week_1: 1,
        retention_pct: 33.3
      }
    ]);
  });
});
