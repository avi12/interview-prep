import { describe, expect, it } from "vitest";
import { runSeeded } from "#kit/db.ts";

const SCHEMA = `CREATE TABLE employees (id int PRIMARY KEY, name text NOT NULL, department text NOT NULL, salary int NOT NULL);`;

const COMPANY = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Dana', 'engineering', 9000), (2, 'Omer', 'engineering', 8000), (3, 'Zed', 'engineering', 9000),
  (4, 'Noa', 'sales', 6000), (5, 'Yael', 'sales', 5000), (6, 'Ben', 'support', 4000);`;

const STARTUP = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Bat', 'data', 5000), (2, 'Ari', 'data', 5000), (3, 'Cal', 'data', 3000),
  (4, 'Fay', 'ops', 1000), (5, 'Eli', 'ops', 2000), (6, 'Hal', 'hr', 700);`;

const run = (seed: string) =>
  runSeeded({ seed, testUrl: import.meta.url, file: "query.sql", numericColumns: ["salary"] });

describe("highest paid person per department", () => {
  it("returns the columns department, name, salary", async () => {
    const { columns } = await run(COMPANY);
    expect(columns).toEqual(["department", "name", "salary"]);
  });

  it("returns one row per department and breaks a tie by name", async () => {
    const { rows } = await run(COMPANY);
    expect(rows).toEqual([
      { department: "engineering", name: "Dana", salary: 9000 },
      { department: "sales", name: "Noa", salary: 6000 },
      { department: "support", name: "Ben", salary: 4000 }
    ]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(STARTUP);
    expect(rows).toEqual([
      { department: "data", name: "Ari", salary: 5000 },
      { department: "hr", name: "Hal", salary: 700 },
      { department: "ops", name: "Eli", salary: 2000 }
    ]);
  });
});
