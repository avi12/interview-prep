---
title: How a Query Runs
lang: sql
minutes: 12
level: junior
roles: [backend, analyst, ai]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/sql-select.html
  - https://www.postgresql.org/docs/current/queries-select-lists.html
  - https://www.postgresql.org/docs/current/planner-optimizer.html
---

## You write SELECT first, it runs FROM first

You type `SELECT` at the top. The database does not start there. It first needs a table to work on, then it throws rows away, and only near the end does it pick and name the columns.

The **logical order** is:

`FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `DISTINCT` → `ORDER BY` → `LIMIT`

Each step gets the table the step before it produced, and the table only gets smaller.

```svg The order you type (top) is not the order it runs (middle); the table shrinks at every step on the way
<svg viewBox="0 0 640 270" role="img" aria-label="Written order versus run order, with a table shrinking through each step">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="written">
      <text x="16" y="16" fill="var(--fg-muted)">you write</text>
      <rect x="16" y="24" width="70" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="51" y="41" fill="var(--fg)" text-anchor="middle">SELECT</text>
      <rect x="94" y="24" width="70" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="129" y="41" fill="var(--fg)" text-anchor="middle">DISTINCT</text>
      <rect x="172" y="24" width="70" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="207" y="41" fill="var(--fg)" text-anchor="middle">FROM</text>
      <rect x="250" y="24" width="70" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="285" y="41" fill="var(--fg)" text-anchor="middle">WHERE</text>
      <rect x="328" y="24" width="70" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="363" y="41" fill="var(--fg)" text-anchor="middle">GROUP BY</text>
      <rect x="406" y="24" width="70" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="441" y="41" fill="var(--fg)" text-anchor="middle">HAVING</text>
      <rect x="484" y="24" width="70" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="519" y="41" fill="var(--fg)" text-anchor="middle">ORDER BY</text>
      <rect x="562" y="24" width="70" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="597" y="41" fill="var(--fg)" text-anchor="middle">LIMIT</text>
    </g>
    <g data-cue="run" fill="none" stroke-width="2">
      <path d="M51 50 L363 104" stroke="var(--accent-2)"/>
      <path d="M129 50 L441 104" stroke="var(--accent-2)"/>
      <path d="M207 50 L51 104" stroke="var(--border)"/>
      <path d="M285 50 L129 104" stroke="var(--border)"/>
      <path d="M363 50 L207 104" stroke="var(--border)"/>
      <path d="M441 50 L285 104" stroke="var(--border)"/>
      <path d="M519 50 L519 104" stroke="var(--border)"/>
      <path d="M597 50 L597 104" stroke="var(--border)"/>
      <text x="16" y="98" fill="var(--fg-muted)" stroke="none">it runs</text>
    </g>
    <g data-cue="from">
      <rect x="16" y="104" width="70" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="51" y="121" fill="var(--fg)" text-anchor="middle">FROM</text>
      <rect x="16" y="146" width="70" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="16" y="160" width="70" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="16" y="174" width="70" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="16" y="188" width="70" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="16" y="202" width="70" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="16" y="216" width="70" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="16" y="230" width="70" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <text x="51" y="258" fill="var(--fg-muted)" text-anchor="middle">7 rows</text>
    </g>
    <g data-cue="where">
      <rect x="94" y="104" width="70" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="129" y="121" fill="var(--fg)" text-anchor="middle">WHERE</text>
      <rect x="94" y="146" width="70" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="94" y="160" width="70" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="94" y="174" width="70" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="94" y="188" width="70" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="94" y="202" width="70" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <text x="129" y="258" fill="var(--fg-muted)" text-anchor="middle">5 rows</text>
    </g>
    <g data-cue="group">
      <rect x="172" y="104" width="70" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="207" y="121" fill="var(--fg)" text-anchor="middle">GROUP BY</text>
      <rect x="172" y="146" width="70" height="10" fill="var(--cat-1)" stroke="var(--border)"/>
      <rect x="172" y="160" width="70" height="10" fill="var(--cat-2)" stroke="var(--border)"/>
      <rect x="172" y="174" width="70" height="10" fill="var(--cat-3)" stroke="var(--border)"/>
      <rect x="172" y="188" width="70" height="10" fill="var(--cat-4)" stroke="var(--border)"/>
      <text x="207" y="258" fill="var(--fg-muted)" text-anchor="middle">4 groups</text>
    </g>
    <g data-cue="having">
      <rect x="250" y="104" width="70" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="285" y="121" fill="var(--fg)" text-anchor="middle">HAVING</text>
      <rect x="250" y="146" width="70" height="10" fill="var(--cat-1)" stroke="var(--border)"/>
      <rect x="250" y="160" width="70" height="10" fill="var(--cat-2)" stroke="var(--border)"/>
      <rect x="250" y="174" width="70" height="10" fill="var(--cat-3)" stroke="var(--border)"/>
      <text x="285" y="258" fill="var(--fg-muted)" text-anchor="middle">3 groups</text>
    </g>
    <g data-cue="select">
      <rect x="328" y="104" width="70" height="26" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="363" y="121" fill="var(--fg)" text-anchor="middle">SELECT</text>
      <rect x="343" y="146" width="40" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="343" y="160" width="40" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="343" y="174" width="40" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <text x="363" y="258" fill="var(--fg-muted)" text-anchor="middle">names made</text>
    </g>
    <g data-cue="distinct">
      <rect x="406" y="104" width="70" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="441" y="121" fill="var(--fg)" text-anchor="middle">DISTINCT</text>
      <rect x="421" y="146" width="40" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="421" y="160" width="40" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <text x="441" y="258" fill="var(--fg-muted)" text-anchor="middle">2 rows</text>
    </g>
    <g data-cue="order">
      <rect x="484" y="104" width="70" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="519" y="121" fill="var(--fg)" text-anchor="middle">ORDER BY</text>
      <rect x="499" y="146" width="40" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <rect x="499" y="160" width="40" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <path d="M546 146 L546 170 M542 164 L546 170 L550 164" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <text x="519" y="258" fill="var(--fg-muted)" text-anchor="middle">sorted</text>
    </g>
    <g data-cue="limit">
      <rect x="562" y="104" width="70" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="597" y="121" fill="var(--fg)" text-anchor="middle">LIMIT</text>
      <rect x="577" y="146" width="40" height="10" fill="var(--surface-3)" stroke="var(--border)"/>
      <text x="597" y="176" fill="var(--fg-muted)" text-anchor="middle">1 row</text>
    </g>
  </g>
</svg>
```

```narrate
[[written]] The top row is the order you type, and select comes first. [[run]] The lines show where each word really runs. [[from]] From loads the whole table, seven rows. [[where]] Where throws single rows away, five are left. [[group]] Group by packs them into buckets, [[having]] and having drops whole buckets. [[select]] Only now does select pick the columns and give them their names. [[distinct]] Distinct removes duplicate rows. [[order]] Order by sorts what is left, [[limit]] and limit keeps the first few.
```

> **Why:** each step needs the result of the one before. You cannot pick columns from a table that is not loaded, or sort rows that were not filtered yet.

## Why your alias "does not exist"

`AS yearly_salary` gives a column its name in the `SELECT` step. `WHERE` runs **before** that step, so the name does not exist yet.

```sql
SELECT name, salary * 12 AS yearly_salary
FROM employees
WHERE yearly_salary > 90000;
-- ERROR: column "yearly_salary" does not exist
```

`ORDER BY` runs **after** `SELECT`, so there the alias works.

Two fixes:

- Repeat the expression: `WHERE salary * 12 > 90000`
- Or name it in a subquery first, then filter the outer query

> **Not this:** renaming the alias or quoting it. The spelling is fine. The problem is timing, and only moving the expression to where it exists fixes it.

```narrate
The alias is born in the select step. Where runs before select, so where looks for a column called yearly salary in the table and finds nothing. Order by runs after select, so the alias is ready there. To filter, repeat the math in where, or compute it in a subquery and filter outside.
```

```quiz
q: In SELECT salary * 12 AS yearly_salary FROM employees, where can you write yearly_salary?
options:
  - in WHERE and in ORDER BY
  - only in ORDER BY
  - only in WHERE
answer: 1
why: The name is made in the SELECT step. ORDER BY runs after it and sees the name, WHERE runs before it and does not.
```

## WHERE filters rows, HAVING filters groups

`WHERE` sits before `GROUP BY`, so it sees single rows. `HAVING` sits after, so it sees whole groups and their totals.

```sql
SELECT department, COUNT(*) AS headcount
FROM employees
WHERE salary > 5000
GROUP BY department
HAVING COUNT(*) >= 2;
```

Read it in run order: drop the low salaries, make one bucket per department, then keep departments with at least two people left.

> **Trap:** `WHERE COUNT(*) >= 2`. Counts are made in the group step, after `WHERE` is done.

This is a preview. `GROUP BY` gets its own lesson soon.

```narrate
Where comes before group by, so it can only judge one row at a time. Having comes after, so it can judge a whole group by its count or its sum. A count in where fails, because counts do not exist yet. Group by gets its own lesson soon.
```

## DISTINCT removes duplicate rows

`DISTINCT` runs right after `SELECT`, on the finished output rows. Two rows count as duplicates when **every** column matches.

```sql
SELECT DISTINCT department
FROM employees;
```

Seven employees, three departments: three rows come back.

- `SELECT DISTINCT department, name` removes almost nothing, because names differ
- It works on output rows, so pick the columns first, then think about duplicates

```narrate
Distinct runs right after select, on the rows you are about to return. Two rows are duplicates only when every column matches. Select distinct department gives one row per department. Add the name and almost nothing is removed, because the names are all different.
```

## Logical order, not the real plan

The order above is the **logical** one: it tells you what each clause can see. The database's planner may physically do the work differently, for example reading an index to skip rows. The PostgreSQL docs say one query "can be actually executed in a wide variety of different ways, each of which will produce the same set of results."

So the logical order explains **meaning and errors**, not speed.

Interview angle: "In what order does SQL run?" is a classic junior question. Say the eight steps, then use them: "that is why an alias is unknown in `WHERE` but fine in `ORDER BY`."

```narrate
This order is the logical one. It tells you what each clause is allowed to see. The planner may do the real work in another way, as long as the answer is the same. In an interview, say the eight steps, then use them to explain the column does not exist error.
```

```quiz
q: Which clause does the database logically run first?
options:
  - SELECT
  - FROM
  - WHERE
answer: 1
why: FROM loads the table every later step works on. SELECT is written first but runs fifth.
```

## Your turn

`query.sql` already has a query, and it fails with `column "yearly_salary" does not exist`. Fix it on the table `employees` (`id`, `name`, `department`, `salary`, where `salary` is monthly).

- Columns, in this order: `name`, `yearly_salary` (`salary * 12`)
- Keep only people whose yearly salary is **over 90000**
- Sort by `yearly_salary` descending, then `name`
- The tests run it on two different datasets, so no hardcoding

```hint
Walk the run order. Which step creates the name yearly_salary, and does WHERE come before or after it?
```

```hint
WHERE cannot see the alias, but it can see salary. Write the math out again there.
```

```hint
Use WHERE salary * 12 > 90000 and keep ORDER BY yearly_salary DESC, name as it is.
```
