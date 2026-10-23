import { describe, expect, it } from "vitest";
import { runSeeded } from "#kit/db.ts";

const SCHEMA = `
CREATE TABLE departments (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE employees (id int PRIMARY KEY, name text NOT NULL, department_id int REFERENCES departments(id), salary int NOT NULL);`;

const COMPANY = `${SCHEMA}
INSERT INTO departments VALUES (1, 'engineering'), (2, 'sales'), (3, 'support');
INSERT INTO employees VALUES
  (1, 'Dana', 1, 9000), (2, 'Omer', 2, 7000), (3, 'Ben', NULL, 5000), (4, 'Noa', 1, 8000);`;

const STARTUP = `${SCHEMA}
INSERT INTO departments VALUES (10, 'data'), (20, 'ops'), (30, 'legal');
INSERT INTO employees VALUES
  (5, 'Ari', 20, 4000), (6, 'Bat', NULL, 3000), (7, 'Cal', 10, 6000), (8, 'Dov', NULL, 2000);`;

const run = (seed: string) => runSeeded({ seed, testUrl: import.meta.url, file: "query.sql" });

describe("every employee with their department", () => {
  it("returns the columns employee, department", async () => {
    const { columns } = await run(COMPANY);
    expect(columns).toEqual(["employee", "department"]);
  });

  it("keeps the employee with no department, with department NULL (LEFT JOIN, not INNER)", async () => {
    const { rows } = await run(COMPANY);
    expect(rows).toEqual([
      { employee: "Dana", department: "engineering" },
      { employee: "Omer", department: "sales" },
      { employee: "Ben", department: null },
      { employee: "Noa", department: "engineering" }
    ]);
  });

  it("does not add a row for a department with nobody in it", async () => {
    const { rows } = await run(COMPANY);
    expect(rows.map(row => row.department)).not.toContain("support");
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(STARTUP);
    expect(rows).toEqual([
      { employee: "Ari", department: "ops" },
      { employee: "Bat", department: null },
      { employee: "Cal", department: "data" },
      { employee: "Dov", department: null }
    ]);
  });
});
