import { runSeeded } from "#kit/db.ts";
import { describe, expect, it } from "vitest";

const SCHEMA = `CREATE TABLE employees (id int PRIMARY KEY, name text NOT NULL, department text NOT NULL, salary int NOT NULL);`;

const COMPANY = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Ben', 'support', 7000), (2, 'Zoe', 'sales', 8000), (3, 'Dana', 'engineering', 9000),
  (4, 'Omer', 'engineering', 8000), (5, 'Noa', 'sales', 6000), (6, 'Lior', 'engineering', 8000);`;

const STARTUP = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Yon', 'data', 5000), (2, 'Hal', 'hr', 700), (3, 'Cal', 'data', 5000),
  (4, 'Eli', 'ops', 2000), (5, 'Bat', 'data', 5000), (6, 'Ari', 'ops', 5000);`;

function run(seed: string) {
  return runSeeded({
    seed,
    testUrl: import.meta.url,
    file: "query.sql"
  });
}

describe("three highest-paid people", () => {
  it("returns the columns name, salary", async () => {
    const { columns } = await run(COMPANY);
    expect(columns).toEqual(["name", "salary"]);
  });

  it("puts the highest salary first and breaks the tie at the cut by name", async () => {
    const { rows } = await run(COMPANY);
    expect(rows).toEqual([
      {
        name: "Dana",
        salary: 9000
      },
      {
        name: "Lior",
        salary: 8000
      },
      {
        name: "Omer",
        salary: 8000
      }
    ]);
  });

  it("works on different data too, where four people tie at the top (no hardcoding)", async () => {
    const { rows } = await run(STARTUP);
    expect(rows).toEqual([
      {
        name: "Ari",
        salary: 5000
      },
      {
        name: "Bat",
        salary: 5000
      },
      {
        name: "Cal",
        salary: 5000
      }
    ]);
  });
});
