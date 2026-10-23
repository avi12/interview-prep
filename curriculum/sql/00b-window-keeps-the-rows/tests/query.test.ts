import { runSeeded } from "#kit/db.ts";
import { describe, expect, it } from "vitest";

const SCHEMA = `CREATE TABLE employees (id int PRIMARY KEY, name text NOT NULL, department text NOT NULL, salary int NOT NULL);`;

const COMPANY = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Dana', 'engineering', 9000), (2, 'Omer', 'engineering', 8000), (3, 'Lior', 'engineering', 7000),
  (4, 'Noa', 'sales', 6000), (5, 'Yael', 'sales', 5000), (6, 'Ben', 'support', 4000);`;

const STARTUP = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Ari', 'data', 5000), (2, 'Bat', 'data', 5000), (3, 'Cal', 'data', 3000),
  (4, 'Eli', 'ops', 2000), (5, 'Fay', 'ops', 1000), (6, 'Hal', 'hr', 700);`;

function run(seed: string) {
  return runSeeded({
    seed,
    testUrl: import.meta.url,
    file: "query.sql",
    numericColumns: ["salary", "gap"]
  });
}

describe("salary gap to the department average", () => {
  it("returns the columns name, department, salary, gap", async () => {
    const { columns } = await run(COMPANY);
    expect(columns).toEqual(["name", "department", "salary", "gap"]);
  });

  it("keeps every employee, including a department of one", async () => {
    const { rows } = await run(COMPANY);
    expect(rows).toEqual([
      {
        name: "Dana",
        department: "engineering",
        salary: 9000,
        gap: 1000
      },
      {
        name: "Lior",
        department: "engineering",
        salary: 7000,
        gap: -1000
      },
      {
        name: "Omer",
        department: "engineering",
        salary: 8000,
        gap: 0
      },
      {
        name: "Noa",
        department: "sales",
        salary: 6000,
        gap: 500
      },
      {
        name: "Yael",
        department: "sales",
        salary: 5000,
        gap: -500
      },
      {
        name: "Ben",
        department: "support",
        salary: 4000,
        gap: 0
      }
    ]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(STARTUP);
    expect(rows).toEqual([
      {
        name: "Ari",
        department: "data",
        salary: 5000,
        gap: 667
      },
      {
        name: "Bat",
        department: "data",
        salary: 5000,
        gap: 667
      },
      {
        name: "Cal",
        department: "data",
        salary: 3000,
        gap: -1333
      },
      {
        name: "Hal",
        department: "hr",
        salary: 700,
        gap: 0
      },
      {
        name: "Eli",
        department: "ops",
        salary: 2000,
        gap: 500
      },
      {
        name: "Fay",
        department: "ops",
        salary: 1000,
        gap: -500
      }
    ]);
  });
});
