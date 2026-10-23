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
  runSeeded({ seed, testUrl: import.meta.url, file: "query.sql", numericColumns: ["salary", "company_total", "percent_of_total"] });

describe("company total and share of total on every row", () => {
  it("returns the columns name, salary, company_total, percent_of_total", async () => {
    const { columns } = await run(COMPANY);
    expect(columns).toEqual(["name", "salary", "company_total", "percent_of_total"]);
  });

  it("keeps every employee, writes the same total on each row and a share that is not cut to 0", async () => {
    const { rows } = await run(COMPANY);
    expect(rows).toEqual([
      { name: "Dana", salary: 9000, company_total: 39000, percent_of_total: 23.1 },
      { name: "Omer", salary: 8000, company_total: 39000, percent_of_total: 20.5 },
      { name: "Lior", salary: 7000, company_total: 39000, percent_of_total: 17.9 },
      { name: "Noa", salary: 6000, company_total: 39000, percent_of_total: 15.4 },
      { name: "Yael", salary: 5000, company_total: 39000, percent_of_total: 12.8 },
      { name: "Ben", salary: 4000, company_total: 39000, percent_of_total: 10.3 }
    ]);
  });

  it("works on different data too (no hardcoding)", async () => {
    const { rows } = await run(STARTUP);
    expect(rows).toEqual([
      { name: "Ari", salary: 5000, company_total: 16700, percent_of_total: 29.9 },
      { name: "Bat", salary: 5000, company_total: 16700, percent_of_total: 29.9 },
      { name: "Cal", salary: 3000, company_total: 16700, percent_of_total: 18 },
      { name: "Eli", salary: 2000, company_total: 16700, percent_of_total: 12 },
      { name: "Fay", salary: 1000, company_total: 16700, percent_of_total: 6 },
      { name: "Hal", salary: 700, company_total: 16700, percent_of_total: 4.2 }
    ]);
  });
});
