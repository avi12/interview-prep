import { describe, expect, it } from "vitest";
import { runSeeded } from "#kit/db.ts";

const SCHEMA = `CREATE TABLE employees (id int PRIMARY KEY, name text NOT NULL, department text NOT NULL, salary int NOT NULL);`;

const COMPANY = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Dana', 'engineering', 9000), (2, 'Omer', 'engineering', 8000), (3, 'Lior', 'engineering', 7000),
  (4, 'Noa', 'sales', 6000), (5, 'Yael', 'sales', 5000), (6, 'Tal', 'engineering', 8000),
  (7, 'Ben', 'support', 4000);`;

const STARTUP = `${SCHEMA}
INSERT INTO employees VALUES
  (1, 'Ari', 'data', 5000), (2, 'Bat', 'data', 5000), (3, 'Cal', 'data', 5000), (4, 'Dov', 'data', 3000),
  (5, 'Eli', 'ops', 2000), (6, 'Fay', 'ops', 1000), (7, 'Gil', 'ops', 500);`;

const run = (seed: string) => runSeeded({ seed, testUrl: import.meta.url, file: "query.sql" });

describe("top two salaries per department", () => {
  it("returns the columns department, name, salary", async () => {
    const { columns } = await run(COMPANY);
    expect(columns).toEqual(["department", "name", "salary"]);
  });

  it("keeps tied people together (DENSE_RANK, not ROW_NUMBER)", async () => {
    const { rows } = await run(COMPANY);
    expect(rows).toEqual([
      { department: "engineering", name: "Dana", salary: 9000 },
      { department: "engineering", name: "Omer", salary: 8000 },
      { department: "engineering", name: "Tal", salary: 8000 },
      { department: "sales", name: "Noa", salary: 6000 },
      { department: "sales", name: "Yael", salary: 5000 },
      { department: "support", name: "Ben", salary: 4000 }
    ]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(STARTUP);
    expect(rows).toEqual([
      { department: "data", name: "Ari", salary: 5000 },
      { department: "data", name: "Bat", salary: 5000 },
      { department: "data", name: "Cal", salary: 5000 },
      { department: "data", name: "Dov", salary: 3000 },
      { department: "ops", name: "Eli", salary: 2000 },
      { department: "ops", name: "Fay", salary: 1000 }
    ]);
  });
});
