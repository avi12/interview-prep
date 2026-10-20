---
title: GROUP BY Collapses Rows
lang: sql
minutes: 12
level: junior
roles: [backend, analyst]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/tutorial-agg.html
  - https://www.postgresql.org/docs/current/sql-select.html
---

## Many rows in, one row out

`GROUP BY` puts rows with the same value into one bucket, then gives you **one row per bucket**.

```sql
SELECT department, COUNT(*) AS headcount
FROM employees
GROUP BY department;
```

Seven employees in three departments come out as **three rows**. The individual names are gone, because a bucket has many names and the row has room for one.

```svg GROUP BY turns many rows into one row per bucket, and the names disappear
<svg viewBox="0 0 520 190" role="img" aria-label="Rows collapsing into groups">
  <g data-cue="rows" font-family="var(--font-mono)" font-size="14">
    <rect x="20" y="20" width="170" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="40" fill="var(--fg)">Dana  engineering</text>
    <rect x="20" y="54" width="170" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="74" fill="var(--fg)">Omer  engineering</text>
    <rect x="20" y="88" width="170" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="108" fill="var(--fg)">Noa   sales</text>
    <rect x="20" y="122" width="170" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="142" fill="var(--fg)">Yael  sales</text>
  </g>
  <g data-cue="arrow">
    <path d="M200 86 L300 86" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    <path d="M292 80 L302 86 L292 92" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
  </g>
  <g data-cue="groups" font-family="var(--font-mono)" font-size="14">
    <rect x="310" y="44" width="190" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="320" y="64" fill="var(--fg)">engineering   2</text>
    <rect x="310" y="98" width="190" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="320" y="118" fill="var(--fg)">sales         2</text>
  </g>
</svg>
```

```narrate
[[rows]] Here are four employees, two in engineering and two in sales. [[arrow]] Group by squeezes them. [[groups]] You get one row per department, with a count. Dana, Omer, Noa and Yael are gone, because each row now stands for a whole bucket.
```

> **Why:** an aggregate such as `COUNT`, `SUM` or `AVG` needs many rows to chew on. `GROUP BY` decides which rows go together.

> **Not this:** selecting `name` next to `GROUP BY department`. A bucket has many names, so SQL refuses.

## Count and average

Each bucket can hold a few summaries at once.

```sql
SELECT department,
       COUNT(*)            AS headcount,
       ROUND(AVG(salary))  AS average_salary
FROM employees
GROUP BY department;
```

- `COUNT(*)` counts rows in the bucket
- `AVG(salary)` averages one column
- `ROUND` drops the decimals

```narrate
Each bucket can answer several questions at once. Count star counts the rows in the bucket. Average of salary averages one column. Round removes the decimals so the number is easy to read.
```

```quiz
q: What does SELECT department, name FROM employees GROUP BY department do?
options:
  - returns one row per employee
  - fails, because name is not grouped or aggregated
  - returns the first name of each department
answer: 1
why: A bucket holds many names and a row has room for one, so SQL asks you to group by name or aggregate it.
```

## WHERE or HAVING?

- `WHERE` filters **rows**, before the buckets are made
- `HAVING` filters **buckets**, after the summaries exist

"Departments with at least 2 people" is about buckets, so it needs `HAVING`.

```sql
SELECT department, COUNT(*) AS headcount
FROM employees
GROUP BY department
HAVING COUNT(*) >= 2;
```

> **Trap:** `WHERE COUNT(*) >= 2`. A count does not exist yet when `WHERE` runs, so it fails.

```narrate
Where filters single rows, before the buckets are made. Having filters whole buckets, after the counts exist. Departments with at least two people is a question about buckets, so it needs having.
```

## Your turn

Open `query.sql` and write one query on `employees`. Return departments with **at least 2 people**.

- Columns, in this order: `department`, `headcount`, `average_salary`
- `average_salary` is `ROUND(AVG(salary))`
- Sort by `department`

```hint
You need GROUP BY department and two summaries: COUNT(*) and AVG(salary).
```

```hint
Wrap the average as ROUND(AVG(salary)) and name the columns with AS.
```

```hint
Add HAVING COUNT(*) >= 2 after GROUP BY, then ORDER BY department.
```
