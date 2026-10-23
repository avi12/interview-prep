import { describe, expect, it } from "vitest";
import { runSeeded } from "#kit/db.ts";

const SCHEMA = `CREATE TABLE employees (id int PRIMARY KEY, name text NOT NULL, department text NOT NULL, salary int NOT NULL);`;

const COMPANY = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Dana', 'engineering', 9000), (2, 'Omer', 'engineering', 8000), (3, 'Lior', 'engineering', 7000),
  (4, 'Noa', 'sales', 6000), (5, 'Yael', 'sales', 5000), (6, 'Ben', 'support', 4000);`;

const STARTUP = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Ari', 'data', 5000), (2, 'Bat', 'data', 5000), (3, 'Cal', 'data', 3000),
  (4, 'Eli', 'ops', 2000), (5, 'Fay', 'ops', 1000), (6, 'Hal', 'hr', 700);`;

const run = (seed: string) =>
  runSeeded({ seed, testUrl: import.meta.url, file: "query.sql", numericColumns: ["headcount", "average_salary"] });

describe("departments with at least two people", () => {
  it("returns the columns department, headcount, average_salary", async () => {
    const { columns } = await run(COMPANY);
    expect(columns).toEqual(["department", "headcount", "average_salary"]);
  });

  it("returns one row per department and drops the department of one", async () => {
    const { rows } = await run(COMPANY);
    expect(rows).toEqual([
      { department: "engineering", headcount: 3, average_salary: 8000 },
      { department: "sales", headcount: 2, average_salary: 5500 }
    ]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(STARTUP);
    expect(rows).toEqual([
      { department: "data", headcount: 3, average_salary: 4333 },
      { department: "ops", headcount: 2, average_salary: 1500 }
    ]);
  });
});
