---
title: A Window Keeps the Rows
lang: sql
minutes: 12
level: junior
roles: [backend, analyst]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/tutorial-window.html
  - https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS
---

## Same summary, no collapse

Last lesson, `GROUP BY` gave one row per department. Often you want the summary **next to** each person.

Add `OVER (...)` after an aggregate and it becomes a **window function**: it computes the same summary but keeps every row.

```sql
SELECT name, department, salary,
       ROUND(AVG(salary) OVER (PARTITION BY department)) AS department_average
FROM employees;
```

Every employee stays. Each row also shows the average of **their own department**.

```svg GROUP BY collapses the rows, a window writes the summary onto every row
<svg viewBox="0 0 520 200" role="img" aria-label="Group by versus window">
  <g data-cue="group" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="28" fill="var(--fg-muted)">GROUP BY</text>
    <rect x="20" y="40" width="200" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="60" fill="var(--fg)">engineering  avg 8000</text>
    <text x="20" y="100" fill="var(--danger)">names are gone</text>
  </g>
  <g data-cue="window" font-family="var(--font-mono)" font-size="14">
    <text x="270" y="28" fill="var(--fg-muted)">OVER (PARTITION BY)</text>
    <rect x="270" y="40" width="230" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="280" y="60" fill="var(--fg)">Dana  9000  avg 8000</text>
    <rect x="270" y="74" width="230" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="280" y="94" fill="var(--fg)">Omer  8000  avg 8000</text>
    <rect x="270" y="108" width="230" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="280" y="128" fill="var(--fg)">Lior  7000  avg 8000</text>
    <text x="270" y="170" fill="var(--ok)">every row stays</text>
  </g>
</svg>
```

```narrate
[[group]] Group by gives one row for engineering, and the names are gone. [[window]] A window function gives you the same average, but written onto every row. Dana, Omer and Lior all stay, and each one carries the department average.
```

> **Why:** now you can compare a person to their group, in one query and with no join.

> **Not this:** a `GROUP BY` subquery joined back to `employees`. It works, but it is longer and easier to get wrong.

## PARTITION BY is the bucket

`PARTITION BY department` says which rows share a summary. It is the window version of `GROUP BY department`, but it does not collapse anything.

Leave it out and the whole table is one bucket.

```sql
SELECT name, salary, AVG(salary) OVER () AS company_average
FROM employees;
```

```narrate
Partition by plays the role group by played before. It decides which rows share a summary, but it never squeezes the rows. Leave it out and the whole table becomes one bucket, so everyone sees the company average.
```

```quiz
q: How many rows does SELECT name, AVG(salary) OVER (PARTITION BY department) FROM employees return for 7 employees?
options:
  - one per department
  - 7
  - 1
answer: 1
why: A window never collapses rows. Every employee stays.
```

## Compare a row to its group

Because the average sits on the row, you can do math with it.

```sql
SELECT name, salary,
       salary - ROUND(AVG(salary) OVER (PARTITION BY department)) AS gap
FROM employees;
```

A positive `gap` means paid above the department average.

> **Trap:** a window function cannot go in `WHERE`. Wrap the query in a `WITH` step and filter outside. The next lessons show how.

```narrate
Because the average sits on the row, you can subtract it. The gap is the salary minus the department average. A positive gap means paid above average. One warning: you cannot filter on a window function in where. You wrap it in a with step first.
```

## Your turn

Open `query.sql` and write one query on `employees`. For **every** employee, show how far their salary is from their department average.

- Columns, in this order: `name`, `department`, `salary`, `gap`
- `gap` is `salary - ROUND(AVG(salary) OVER (PARTITION BY department))`
- Sort by `department`, then `name`

```hint
Start from SELECT name, department, salary FROM employees.
```

```hint
Add the average as a window: AVG(salary) OVER (PARTITION BY department).
```

```hint
Round the average, subtract it from salary, name it gap, then ORDER BY department, name.
```
