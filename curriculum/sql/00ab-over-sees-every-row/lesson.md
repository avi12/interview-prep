---
title: OVER() Sees Every Row
lang: sql
minutes: 12
level: junior
roles: [analyst, backend, ai]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/tutorial-window.html
  - https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS
  - https://www.postgresql.org/docs/current/functions-math.html
---

## A total next to every row

`GROUP BY` answers "one row per group". Sometimes you want the **detail row and a total beside it**: each person, their salary, and the company total.

Put `OVER ()` after an aggregate. It computes the sum **once, over all rows**, then writes the answer onto every row. Nothing collapses.

```sql
SELECT name, salary,
       SUM(salary) OVER () AS company_total
FROM employees;
```

```svg SUM runs once over all six rows, then the same total is stamped onto each row; GROUP BY would leave one row
<svg viewBox="0 0 520 240" role="img" aria-label="A sum computed once and written onto every row">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="rows">
      <text x="20" y="20" fill="var(--fg-muted)">employees</text>
      <rect x="20" y="30" width="140" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="48" fill="var(--fg)">Dana  9000</text>
      <rect x="20" y="62" width="140" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="80" fill="var(--fg)">Omer  8000</text>
      <rect x="20" y="94" width="140" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="112" fill="var(--fg)">Lior  7000</text>
      <rect x="20" y="126" width="140" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="144" fill="var(--fg)">Noa   6000</text>
      <rect x="20" y="158" width="140" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="176" fill="var(--fg)">Yael  5000</text>
      <rect x="20" y="190" width="140" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="208" fill="var(--fg)">Ben   4000</text>
    </g>
    <g data-cue="sum">
      <path d="M164 43 L176 43 L176 203 L164 203 M176 110 L190 110" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <rect x="190" y="92" width="120" height="36" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="200" y="115" fill="var(--fg)">SUM 39000</text>
    </g>
    <g data-cue="stamp">
      <path d="M310 110 L322 110 M322 43 L322 203 M322 43 L330 43 M322 75 L330 75 M322 107 L330 107 M322 139 L330 139 M322 171 L330 171 M322 203 L330 203" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <text x="330" y="20" fill="var(--ok)">OVER (): 6 rows stay</text>
      <rect x="330" y="30" width="170" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="48" fill="var(--fg)">Dana  9000 39000</text>
      <rect x="330" y="62" width="170" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="80" fill="var(--fg)">Omer  8000 39000</text>
      <rect x="330" y="94" width="170" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="112" fill="var(--fg)">Lior  7000 39000</text>
      <rect x="330" y="126" width="170" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="144" fill="var(--fg)">Noa   6000 39000</text>
      <rect x="330" y="158" width="170" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="176" fill="var(--fg)">Yael  5000 39000</text>
      <rect x="330" y="190" width="170" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="208" fill="var(--fg)">Ben   4000 39000</text>
    </g>
    <g data-cue="group">
      <text x="186" y="164" fill="var(--fg-muted)">GROUP BY:</text>
      <rect x="186" y="172" width="124" height="26" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="196" y="190" fill="var(--fg)">1 row 39000</text>
      <text x="186" y="230" fill="var(--danger)">names gone</text>
    </g>
  </g>
</svg>
```

```narrate
[[rows]] Start with six employees, each with a salary. [[sum]] Sum with an empty over adds all six salaries once, and gets thirty nine thousand. [[stamp]] Then it writes that same total onto every row, so all six rows stay, each with the total beside it. [[group]] Group by would give you the same number, but in a single row, with the names gone.
```

> **Why:** a window function (an aggregate followed by `OVER`) does the math without collapsing rows, so detail and summary live in the same row.

## A window runs after WHERE

The database runs the parts of a query in a fixed order. `WHERE` throws rows away early. The window runs late, so it **only sees the rows that survived**.

```svg WHERE filters first, the window runs later and only sums the rows that are left
<svg viewBox="0 0 520 110" role="img" aria-label="Logical run order of a query">
  <g font-family="var(--font-mono)" font-size="12">
    <rect x="10" y="20" width="62" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="22" y="40" fill="var(--fg)">FROM</text>
    <g data-cue="where">
      <rect x="82" y="20" width="62" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="92" y="40" fill="var(--fg)">WHERE</text>
      <text x="82" y="72" fill="var(--danger)">drops rows</text>
    </g>
    <rect x="154" y="20" width="62" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="158" y="40" fill="var(--fg)">GROUP BY</text>
    <rect x="226" y="20" width="62" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="236" y="40" fill="var(--fg)">HAVING</text>
    <g data-cue="window">
      <rect x="298" y="20" width="62" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="306" y="40" fill="var(--fg)">window</text>
      <text x="298" y="72" fill="var(--ok)">sums what is left</text>
    </g>
    <rect x="370" y="20" width="62" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="378" y="40" fill="var(--fg)">SELECT</text>
    <rect x="442" y="20" width="68" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="446" y="40" fill="var(--fg)">ORDER BY</text>
  </g>
</svg>
```

```sql
SELECT name, salary, SUM(salary) OVER () AS total
FROM employees
WHERE department = 'engineering';
```

Every row now shows `24000`, the engineering total, not `39000`.

```narrate
The database follows a fixed order. [[where]] Where runs early and throws rows away. [[window]] The window runs much later, so it only sums the rows that are left. Filter to engineering, and every row shows twenty four thousand instead of thirty nine thousand.
```

```quiz
q: The query has WHERE salary >= 7000 and SUM(salary) OVER (). What sits on each row?
options:
  - 39000, the whole table
  - 24000, only the rows that passed WHERE
  - an error, a window cannot follow WHERE
answer: 1
why: The window runs after WHERE, so it sums only Dana, Omer and Lior.
```

## Share of the total

With the total on the row, a percentage is one division away.

```sql
SELECT name, salary,
       ROUND(salary * 100.0 / SUM(salary) OVER (), 1) AS percent_of_total
FROM employees;
```

- `salary * 100.0` turns the number into a decimal before dividing
- `ROUND(x, 1)` keeps one decimal place: Dana gets `23.1`

> **Trap:** `salary / SUM(salary) OVER () * 100`. Both sides are whole numbers, so PostgreSQL does **integer division** and drops the fraction: `9000 / 39000` is `0`, and `0 * 100` is still `0`. Every share comes out `0`.

```narrate
With the total on the row, a percentage is one division away. Multiply salary by one hundred point zero first, so the math happens with decimals. Then round to one decimal place. A common trap: divide two whole numbers and the fraction is thrown away, so every share comes out as zero.
```

## Not a second query

The total is just one number, so it is tempting to fetch it separately.

```sql
SELECT name, salary,
       (SELECT SUM(salary) FROM employees) AS company_total
FROM employees;
```

> **Not this:** a second query, or a subquery that recomputes the total for the rows. It repeats `FROM` and every filter. Add `WHERE department = 'sales'` to the outer query, forget the inner one, and the total silently counts everyone. `OVER ()` always sees exactly the rows you kept.

Interview line: "I use `SUM(...) OVER ()` so the total and the detail come from the same filtered rows."

Next lesson: `PARTITION BY` restarts the window for each group, so every department gets its own total.

```narrate
It is tempting to fetch the total with a second query, or a subquery inside the select. That repeats the from and every filter. Forget to copy one filter and the total quietly counts rows you removed. Over with empty brackets always sees exactly the rows you kept. Next lesson, partition by restarts the window for each group.
```

## Your turn

Open `query.sql` and write one query on `employees`. Show every employee with the company total and their share of it.

- Columns, in this order: `name`, `salary`, `company_total`, `percent_of_total`
- `company_total` is the sum of **all** salaries, on every row
- `percent_of_total` is the salary as a percent of that total, rounded to **1 decimal**
- Sort by `id`

```hint
GROUP BY gives you one row. You need every employee, so drop GROUP BY and use SUM(salary) OVER ().
```

```hint
For the percent, multiply by 100.0 (a decimal) before dividing, or integer division turns every share into 0.
```

```hint
ROUND(salary * 100.0 / SUM(salary) OVER (), 1) AS percent_of_total, then ORDER BY id.
```
