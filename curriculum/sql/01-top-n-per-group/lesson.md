---
title: Top N per group
lang: sql
minutes: 20
level: junior
roles: [backend, analyst]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/tutorial-window.html
  - https://www.postgresql.org/docs/current/functions-window.html
---

## The question you will be asked

"Show the two highest paid people in each department."

It sounds like `GROUP BY`. It is not. `GROUP BY` **collapses** rows: one row per department, and the names are gone. You need to **keep every row** and add a number to each one.

```narrate
Interviewers love this one. Show the top earners in every department. It sounds like group by, but group by squashes each department into a single row and the names disappear. We need to keep every row and attach a rank to it.
```

## A window keeps the rows

`OVER (PARTITION BY department ORDER BY salary DESC)` means: for each row, look at the rows of the **same department**, sorted by salary, and compute something over them.

```sql
SELECT name, department, salary,
       DENSE_RANK() OVER (
         PARTITION BY department
         ORDER BY salary DESC
       ) AS salary_rank
FROM employees;
```

Every employee stays. Each gets a `salary_rank` inside their own department.

```svg PARTITION BY splits the rows into groups, ORDER BY sorts each group, the rank restarts at 1 in every group
<svg viewBox="0 0 520 210" role="img" aria-label="Rows split by department and ranked">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="eng">
      <text x="20" y="28" fill="var(--fg-muted)">engineering</text>
      <rect x="20" y="36" width="220" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="56" fill="var(--fg)">Dana   9000   rank 1</text>
      <rect x="20" y="70" width="220" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="90" fill="var(--fg)">Omer   8000   rank 2</text>
      <rect x="20" y="104" width="220" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="124" fill="var(--fg)">Lior   7000   rank 3</text>
    </g>
    <g data-cue="sales">
      <text x="270" y="28" fill="var(--fg-muted)">sales</text>
      <rect x="270" y="36" width="220" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="56" fill="var(--fg)">Noa    6000   rank 1</text>
      <rect x="270" y="70" width="220" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="90" fill="var(--fg)">Yael   5000   rank 2</text>
    </g>
    <g data-cue="filter">
      <path d="M20 150 L490 150" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="20" y="178" fill="var(--fg)">keep rank 1 and 2, drop the rest</text>
    </g>
  </g>
</svg>
```

```narrate
Look at the picture. [[eng]] The rows are split by department, sorted by salary, and numbered from one inside engineering. [[sales]] Sales starts again at one, because each department is its own window. [[filter]] Then we keep only ranks one and two.
```

## You cannot filter a window in WHERE

`WHERE` runs **before** windows are computed, so `WHERE salary_rank <= 2` fails. Wrap the query and filter outside.

```narrate
You might try to filter the rank in the where clause. It fails, because where runs before windows exist. The fix is to compute the rank inside a common table expression, then filter it in the outer query.
```

```sql
WITH ranked AS (
  SELECT name, department, salary,
         DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank
  FROM employees
)
SELECT department, name, salary
FROM ranked
WHERE salary_rank <= 2
ORDER BY department, salary DESC, name;
```

> **Why:** the logical order is `FROM` → `WHERE` → `GROUP BY` → `HAVING` → **window** → `SELECT` → `ORDER BY`. Anything computed later cannot be used earlier.

## ROW_NUMBER, RANK or DENSE_RANK?

Two people earn 8000. What is "top 2"?

```narrate
Three functions number rows, and they differ only on ties. Row number never ties. Rank ties and then skips. Dense rank ties and does not skip. For top two salaries with ties kept, dense rank is the one.
```

| Function | Salaries 9000, 8000, 8000, 7000 | Meaning |
|---|---|---|
| `ROW_NUMBER` | 1, 2, 3, 4 | Always unique, ties broken arbitrarily |
| `RANK` | 1, 2, 2, 4 | Ties share a rank, then a gap |
| `DENSE_RANK` | 1, 2, 2, 3 | Ties share a rank, no gap |

> **Not this:** `ROW_NUMBER` for "top 2 salaries". It would drop one of the tied people at random. Ask the interviewer: do ties count? Then pick.

```quiz
q: Salaries in a department are 9000, 8000, 8000, 7000. With DENSE_RANK and the filter rank <= 2, how many rows come back?
options:
  - 2
  - 3
  - 4
answer: 1
why: 9000 is rank 1 and both 8000s are rank 2, so three rows. ROW_NUMBER would have returned only two.
```

## Your turn

Write one query in `query.sql`. For each department return the people with the **two highest distinct salaries**, ties included.

- Columns, in this order: `department`, `name`, `salary`
- Sort: `department`, then `salary` descending, then `name`
- The tests run it on two different datasets, so no hardcoding

```hint
You need a ranking function with PARTITION BY department.
```

```hint
Ties must all stay, and there should be no gap in the ranks. That points to DENSE_RANK.
```

```hint
Put the window inside a CTE, then filter the rank in the outer query.
```
