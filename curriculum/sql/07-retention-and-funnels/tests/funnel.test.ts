import { runSeeded } from "#kit/db.ts";
import { describe, expect, it } from "vitest";

const SCHEMA = `
CREATE TABLE funnel_steps (position int PRIMARY KEY, name text NOT NULL UNIQUE);
INSERT INTO funnel_steps VALUES (1, 'visit'), (2, 'signup'), (3, 'add_to_cart'), (4, 'purchase');
CREATE TABLE funnel_events (user_id int NOT NULL, step text NOT NULL, occurred_at timestamp NOT NULL);`;

function reached({ step, from, to }: {
  step: string;
  from: number;
  to: number;
}) {
  return `
INSERT INTO funnel_events
SELECT user_id, '${step}', TIMESTAMP '2025-02-01 09:00' + user_id * INTERVAL '1 minute'
FROM generate_series(${from}, ${to}) AS user_id;`;
}

const SHOP = `${SCHEMA}
${reached({
  step: "visit",
  from: 1,
  to: 10
})}
${reached({
  step: "signup",
  from: 1,
  to: 6
})}
${reached({
  step: "add_to_cart",
  from: 1,
  to: 3
})}
INSERT INTO funnel_events VALUES
  (1, 'purchase', '2025-02-01 11:00'), (1, 'visit', '2025-02-02 09:00'), (2, 'add_to_cart', '2025-02-02 09:05');`;

const NO_SALES = `${SCHEMA}
${reached({
  step: "visit",
  from: 1,
  to: 8
})}
${reached({
  step: "signup",
  from: 1,
  to: 5
})}
${reached({
  step: "add_to_cart",
  from: 1,
  to: 2
})}
INSERT INTO funnel_events VALUES (2, 'signup', '2025-02-03 10:00');`;

const STALLED = `${SCHEMA}
${reached({
  step: "visit",
  from: 1,
  to: 5
})}
${reached({
  step: "signup",
  from: 1,
  to: 3
})}`;

const NUMERIC_COLUMNS = ["users", "pct_of_previous"];

function run(seed: string) {
  return runSeeded({
    seed,
    testUrl: import.meta.url,
    file: "funnel.sql",
    numericColumns: NUMERIC_COLUMNS
  });
}

describe("funnel conversion by step", () => {
  it("returns step, users, pct_of_previous", async () => {
    const { columns } = await run(SHOP);
    expect(columns).toEqual(["step", "users", "pct_of_previous"]);
  });

  it("counts distinct people per step and compares with the step above", async () => {
    const { rows: steps } = await run(SHOP);
    expect(steps).toEqual([
      {
        step: "visit",
        users: 10,
        pct_of_previous: null
      },
      {
        step: "signup",
        users: 6,
        pct_of_previous: 60
      },
      {
        step: "add_to_cart",
        users: 3,
        pct_of_previous: 50
      },
      {
        step: "purchase",
        users: 1,
        pct_of_previous: 33.3
      }
    ]);
  });

  it("keeps a step nobody reached, with 0 users (no hardcoding)", async () => {
    const { rows: steps } = await run(NO_SALES);
    expect(steps).toEqual([
      {
        step: "visit",
        users: 8,
        pct_of_previous: null
      },
      {
        step: "signup",
        users: 5,
        pct_of_previous: 62.5
      },
      {
        step: "add_to_cart",
        users: 2,
        pct_of_previous: 40
      },
      {
        step: "purchase",
        users: 0,
        pct_of_previous: 0
      }
    ]);
  });

  it("gives NULL, not an error, when the step above has no users (division by zero)", async () => {
    const { rows: steps } = await run(STALLED);
    expect(steps).toEqual([
      {
        step: "visit",
        users: 5,
        pct_of_previous: null
      },
      {
        step: "signup",
        users: 3,
        pct_of_previous: 60
      },
      {
        step: "add_to_cart",
        users: 0,
        pct_of_previous: 0
      },
      {
        step: "purchase",
        users: 0,
        pct_of_previous: null
      }
    ]);
  });
});
