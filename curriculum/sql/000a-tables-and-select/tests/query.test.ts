import { runSeeded } from "#kit/db.ts";
import { describe, expect, it } from "vitest";

const SCHEMA = `CREATE TABLE employees (id int PRIMARY KEY, name text NOT NULL, department text NOT NULL, salary int NOT NULL);`;

const COMPANY = `${SCHEMA}
INSERT INTO employees VALUES
  (3, 'Lior', 'engineering', 7000), (1, 'Dana', 'engineering', 9000), (4, 'Noa', 'sales', 6000),
  (2, 'Omer', 'engineering', 8000), (5, 'Yael', 'sales', 5000);`;

const STARTUP = `${SCHEMA}
INSERT INTO employees VALUES
  (12, 'Cal', 'data', 3000), (10, 'Ari', 'data', 5000), (11, 'Eli', 'ops', 2000);`;

function run(seed: string) {
  return runSeeded({
    seed,
    testUrl: import.meta.url,
    file: "query.sql",
    numericColumns: ["yearly_salary"]
  });
}

describe("employees with a yearly salary", () => {
  it("returns exactly the columns name, department, yearly_salary", async () => {
    const { columns } = await run(COMPANY);
    expect(columns).toEqual(["name", "department", "yearly_salary"]);
  });

  it("returns every employee in id order with salary times twelve", async () => {
    const { rows } = await run(COMPANY);
    expect(rows).toEqual([
      {
        name: "Dana",
        department: "engineering",
        yearly_salary: 108000
      },
      {
        name: "Omer",
        department: "engineering",
        yearly_salary: 96000
      },
      {
        name: "Lior",
        department: "engineering",
        yearly_salary: 84000
      },
      {
        name: "Noa",
        department: "sales",
        yearly_salary: 72000
      },
      {
        name: "Yael",
        department: "sales",
        yearly_salary: 60000
      }
    ]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(STARTUP);
    expect(rows).toEqual([
      {
        name: "Ari",
        department: "data",
        yearly_salary: 60000
      },
      {
        name: "Eli",
        department: "ops",
        yearly_salary: 24000
      },
      {
        name: "Cal",
        department: "data",
        yearly_salary: 36000
      }
    ]);
  });
});
