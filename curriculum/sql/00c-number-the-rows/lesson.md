---
title: Number the Rows
lang: sql
minutes: 12
level: junior
roles: [backend, analyst]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/functions-window.html
  - https://www.postgresql.org/docs/current/queries-with.html
---

## ROW_NUMBER gives each row a place

A window function can also **number** the rows. `ROW_NUMBER()` needs an `ORDER BY` inside `OVER`, so it knows who is first.

```sql
SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS place
FROM employees;
```

The highest salary gets `place` 1, the next 2, and so on.

Add `PARTITION BY` and the count **restarts in every department**, like the average did last lesson.

```svg PARTITION BY restarts the count, ORDER BY decides who is first
<svg viewBox="0 0 520 200" role="img" aria-label="Row numbers restart per department">
  <g data-cue="eng" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="28" fill="var(--fg-muted)">engineering</text>
    <rect x="20" y="36" width="220" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="56" fill="var(--fg)">Dana   9000   place 1</text>
    <rect x="20" y="70" width="220" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="90" fill="var(--fg)">Omer   8000   place 2</text>
  </g>
  <g data-cue="sales" font-family="var(--font-mono)" font-size="14">
    <text x="270" y="28" fill="var(--fg-muted)">sales</text>
    <rect x="270" y="36" width="220" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="280" y="56" fill="var(--fg)">Noa    6000   place 1</text>
    <rect x="270" y="70" width="220" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="280" y="90" fill="var(--fg)">Yael   5000   place 2</text>
  </g>
  <g data-cue="first" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="150" fill="var(--fg)">place 1 = the highest paid of each department</text>
  </g>
</svg>
```

```narrate
[[eng]] In engineering, Dana earns the most, so she gets place one, and Omer gets place two. [[sales]] In sales the count starts again at one, with Noa first. [[first]] So place one always marks the highest paid person of each department.
```

> **Why:** one query numbers every department at once. No loop, no join.

> **Not this:** `ORDER BY salary DESC LIMIT 1` per department, one query each. It breaks the moment a new department appears.

## Keep only place 1

You cannot write `WHERE place = 1`, because `WHERE` runs before windows exist. Put the numbering in a `WITH` step, then filter outside.

```sql
WITH numbered AS (
  SELECT name, department, salary,
         ROW_NUMBER() OVER (
           PARTITION BY department ORDER BY salary DESC
         ) AS place
  FROM employees
)
SELECT department, name, salary
FROM numbered
WHERE place = 1;
```

`WITH` just gives a query a name, so the next query can read from it.

```narrate
You cannot filter the place in where, because windows are computed later. So put the numbering in a with step, which only gives the query a name. The outer query then keeps rows where place equals one.
```

## Ties need a tiebreaker

If two people earn the same, `ROW_NUMBER` still gives different numbers, but **which one is first is random**. Add a second sort key so the answer is stable.

```sql
ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC, name)
```

Now equal salaries are ordered by name, every time.

> **Trap:** no tiebreaker. The test passes today and fails tomorrow, because the order of tied rows is not guaranteed.

```quiz
q: Two people in one department both earn 9000. With ROW_NUMBER, how many get place 1?
options:
  - both
  - exactly one
  - none
answer: 1
why: ROW_NUMBER never repeats a number, so only one is first. The next lesson shows the function that keeps ties together.
```

```narrate
If two people earn the same, row number still gives them different numbers, and which one comes first is not guaranteed. Add a second sort key, like the name, so the answer is the same every time. The next lesson shows a function that keeps ties together.
```

## Your turn

Open `query.sql` and write one query on `employees`. Return the **single highest paid person** of each department. If two earn the same, the earlier name wins.

- Columns, in this order: `department`, `name`, `salary`
- Sort by `department`

```hint
Number the rows with ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC, name).
```

```hint
Put that in a WITH step, because you cannot filter a window in WHERE.
```

```hint
In the outer query, keep the rows where the number equals 1, then ORDER BY department.
```
