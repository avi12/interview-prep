import { describe, expect, it } from "vitest";
import { runSeeded } from "#kit/db.ts";

const SCHEMA = `CREATE TABLE employees (id int PRIMARY KEY, name text NOT NULL, department text NOT NULL, salary int NOT NULL);`;

const COMPANY = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Dana', 'engineering', 9000), (2, 'Tal', 'engineering', 8000), (3, 'Lior', 'engineering', 7500),
  (4, 'Omer', 'sales', 8000), (5, 'Yael', 'sales', 7600), (6, 'Noa', 'sales', 6000), (7, 'Ben', 'support', 4000);`;

const STARTUP = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Cal', 'data', 8000), (2, 'Bat', 'data', 9500), (3, 'Ari', 'data', 8000), (4, 'Dov', 'ops', 7500),
  (5, 'Eli', 'ops', 3000), (6, 'Fay', 'ops', 12000), (7, 'Hal', 'hr', 700);`;

const run = (seed: string) =>
  runSeeded({ seed, testUrl: import.meta.url, file: "query.sql", numericColumns: ["yearly_salary"] });

describe("people earning over 90000 a year", () => {
  it("runs without a column does not exist error and returns name, yearly_salary", async () => {
    const { columns } = await run(COMPANY);
    expect(columns).toEqual(["name", "yearly_salary"]);
  });

  it("keeps only yearly salaries strictly over 90000, highest first, ties by name", async () => {
    const { rows } = await run(COMPANY);
    expect(rows).toEqual([
      { name: "Dana", yearly_salary: 108000 },
      { name: "Omer", yearly_salary: 96000 },
      { name: "Tal", yearly_salary: 96000 },
      { name: "Yael", yearly_salary: 91200 }
    ]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(STARTUP);
    expect(rows).toEqual([
      { name: "Fay", yearly_salary: 144000 },
      { name: "Bat", yearly_salary: 114000 },
      { name: "Ari", yearly_salary: 96000 },
      { name: "Cal", yearly_salary: 96000 }
    ]);
  });
});
