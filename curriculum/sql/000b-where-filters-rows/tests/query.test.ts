import { describe, expect, it } from "vitest";
import { runSeeded } from "#kit/db.ts";

const SCHEMA = `CREATE TABLE employees (id int PRIMARY KEY, name text NOT NULL, department text NOT NULL, salary int NOT NULL);`;

const COMPANY = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Dana', 'engineering', 9000), (2, 'Omer', 'engineering', 5000), (3, 'Lior', 'data', 6000),
  (4, 'Noa', 'sales', 8000), (5, 'Yael', 'data', 4000), (6, 'Tal', 'engineering', 6000),
  (7, 'Ben', 'support', 7000);`;

const STARTUP = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Ari', 'data', 7500), (2, 'Bat', 'engineering', 3000), (3, 'Cal', 'engineering', 5999),
  (4, 'Dov', 'ops', 9000), (5, 'Eli', 'data', 5000), (6, 'Fay', 'engineering', 12000);`;

const run = (seed: string) => runSeeded({ seed, testUrl: import.meta.url, file: "query.sql" });

describe("engineering or data people earning at least 6000", () => {
  it("returns the columns name, department, salary", async () => {
    const { columns } = await run(COMPANY);
    expect(columns).toEqual(["name", "department", "salary"]);
  });

  it("drops engineers under 6000 (parentheses around the OR) and keeps exactly 6000", async () => {
    const { rows } = await run(COMPANY);
    expect(rows).toEqual([
      { name: "Dana", department: "engineering", salary: 9000 },
      { name: "Lior", department: "data", salary: 6000 },
      { name: "Tal", department: "engineering", salary: 6000 }
    ]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(STARTUP);
    expect(rows).toEqual([
      { name: "Ari", department: "data", salary: 7500 },
      { name: "Fay", department: "engineering", salary: 12000 }
    ]);
  });
});
