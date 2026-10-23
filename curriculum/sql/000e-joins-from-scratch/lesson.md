---
title: Joins from scratch
lang: sql
minutes: 15
level: junior
roles: [backend, analyst, ai]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/tutorial-join.html
  - https://www.postgresql.org/docs/current/queries-table-expressions.html
  - https://www.postgresql.org/docs/current/ddl-constraints.html
---

## Why split the data?

Picture one big table where every employee row also spells out the department name.

| id | name | department |
|---|---|---|
| 1 | Dana | engineering |
| 2 | Noa | engineering |
| 3 | Omer | Engeneering |

The name is typed again on every row. Rename the department and you must fix every copy. Miss one, or mistype one, and the data now disagrees with itself.

So we split it: `departments` stores each name **once**, and each employee just points at it with a number.

> **Why:** one fact, one place. Change the department name in one row and every employee sees the new name.

```narrate
Imagine one big table where every employee row repeats the department name. Rename the department and you must fix every copy. Miss one, or misspell it, and the table disagrees with itself. So we split the data. Departments keep each name once, and employees only point at it with a number. A join puts the two halves back together when you read.
```

## Primary key and foreign key

- **Primary key**: the column that names one row, like `departments.id`. It must be unique and never NULL
- **Foreign key**: a column that points at another table's primary key, like `employees.department_id`. The database refuses a number that points at nothing
- A foreign key may be NULL: "this employee has no department yet"

```sql
CREATE TABLE departments (id int PRIMARY KEY, name text);
CREATE TABLE employees (
  id int PRIMARY KEY,
  name text,
  department_id int REFERENCES departments(id)
);
```

```svg The foreign key holds a copy of a primary key value, and that copy is the thread a join follows
<svg viewBox="0 0 520 150" role="img" aria-label="employees.department_id points at departments.id">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="pk">
      <text x="320" y="24" fill="var(--fg-muted)">departments</text>
      <rect x="320" y="32" width="180" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="330" y="52" fill="var(--fg)">id 1  engineering</text>
      <text x="320" y="84" fill="var(--fg-muted)" font-size="12">id: primary key</text>
    </g>
    <g data-cue="fk">
      <text x="10" y="24" fill="var(--fg-muted)">employees</text>
      <rect x="10" y="32" width="200" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="52" fill="var(--fg)">Dana  department 1</text>
      <path d="M210 47 L312 47" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <path d="M304 41 L314 47 L304 53" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <text x="10" y="84" fill="var(--fg-muted)" font-size="12">department_id: foreign key</text>
    </g>
    <g data-cue="null">
      <rect x="10" y="100" width="200" height="30" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="20" y="120" fill="var(--fg)">Ben   department NULL</text>
    </g>
  </g>
</svg>
```

```narrate
[[pk]] On the departments side, the id is the primary key. It names exactly one row, so it is unique and never empty. [[fk]] On the employees side, department id is a foreign key. It holds a copy of a department id, like a thread you can follow. [[null]] Ben's foreign key is null. He simply has no department yet, and that is allowed.
```

## INNER JOIN matches by key

```sql
SELECT employees.name, departments.name
FROM employees
INNER JOIN departments ON departments.id = employees.department_id;
```

`ON` says which rows belong together. For every employee, Postgres finds the department rows where the condition is true and glues them into one wide row.

Rows with **no partner** are dropped, on both sides.

```svg INNER JOIN keeps only pairs. Ben (no department) and support (no employees) both vanish
<svg viewBox="0 0 520 230" role="img" aria-label="Employees matched to departments by key, unmatched rows dropped">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="employees">
      <text x="10" y="22" fill="var(--fg-muted)">employees</text>
      <rect x="10" y="30" width="170" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="50" fill="var(--fg)">Dana    dept 1</text>
      <rect x="10" y="64" width="170" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="84" fill="var(--fg)">Omer    dept 2</text>
      <rect x="10" y="98" width="170" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="118" fill="var(--fg)">Noa     dept 1</text>
    </g>
    <g data-cue="departments">
      <text x="330" y="22" fill="var(--fg-muted)">departments</text>
      <rect x="330" y="30" width="180" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="50" fill="var(--fg)">1  engineering</text>
      <rect x="330" y="64" width="180" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="84" fill="var(--fg)">2  sales</text>
    </g>
    <g data-cue="match">
      <path d="M180 45 L330 45" stroke="var(--ok)" stroke-width="2"/>
      <path d="M180 79 L330 79" stroke="var(--ok)" stroke-width="2"/>
      <path d="M180 113 L330 45" stroke="var(--ok)" stroke-width="2"/>
    </g>
    <g data-cue="dropped" opacity="0.45">
      <rect x="10" y="132" width="170" height="30" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="20" y="152" fill="var(--danger)">Ben     dept NULL</text>
      <rect x="330" y="98" width="180" height="30" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="340" y="118" fill="var(--danger)">3  support</text>
    </g>
    <g data-cue="result">
      <text x="10" y="196" fill="var(--fg)">result: 3 rows (Dana, Omer, Noa)</text>
      <text x="10" y="218" fill="var(--fg-muted)" font-size="12">no partner, no row</text>
    </g>
  </g>
</svg>
```

```narrate
[[employees]] Start with the employees. Each one carries a department number. [[departments]] Next, the departments, each with its own id. [[match]] The on condition draws a line wherever the numbers are equal. Dana and Noa both land on engineering, Omer on sales. [[dropped]] Ben has no number, and support has nobody pointing at it, so an inner join drops both. [[result]] Three rows come out.
```

> **Trap:** "which rows disappear?" is the question behind every join. Ask it before you run the query, not after the report is wrong.

## Aliases and qualified columns

Both tables have a `name` column. Writing just `name` is ambiguous, so Postgres refuses. Put the table in front: `employees.name`.

That gets long, so give each table a short **alias** in `FROM`:

```sql
SELECT e.name AS employee, d.name AS department
FROM employees e
INNER JOIN departments d ON d.id = e.department_id;
```

- `e` now means `employees` for the rest of the query
- Qualify **every** column in a join, even unique ones. If someone later adds a column with the same name, your query still works

```narrate
Both tables have a column called name, so plain name is ambiguous and Postgres refuses. Put the table in front of the column. To keep it short, give each table an alias, like e for employees and d for departments. Qualify every column in a join, so a column added later cannot break your query.
```

## LEFT JOIN keeps the left side

`LEFT JOIN` first does the inner join. Then every left row that found **no partner** is added back, with NULL in the right table's columns.

```sql
SELECT e.name AS employee, d.name AS department
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id;
```

```svg LEFT JOIN brings Ben back with a NULL department. Support stays out, because it sits on the right
<svg viewBox="0 0 520 200" role="img" aria-label="Left join result with a NULL row for the unmatched employee">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="kept">
      <text x="10" y="22" fill="var(--fg-muted)">employee      department</text>
      <rect x="10" y="30" width="300" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="50" fill="var(--fg)">Dana          engineering</text>
      <rect x="10" y="64" width="300" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="84" fill="var(--fg)">Omer          sales</text>
      <rect x="10" y="98" width="300" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="118" fill="var(--fg)">Noa           engineering</text>
    </g>
    <g data-cue="ben">
      <rect x="10" y="132" width="300" height="30" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="20" y="152" fill="var(--fg)">Ben           NULL</text>
    </g>
    <g data-cue="support" opacity="0.45">
      <rect x="330" y="30" width="170" height="30" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="340" y="50" fill="var(--danger)">support</text>
      <text x="330" y="80" fill="var(--fg-muted)" font-size="12">right side, unmatched:</text>
      <text x="330" y="96" fill="var(--fg-muted)" font-size="12">still dropped</text>
    </g>
  </g>
</svg>
```

```narrate
[[kept]] The three matched rows are the same as before. [[ben]] Ben comes back, because a left join keeps every row of the left table. His department is null, meaning nothing matched. [[support]] Support is still missing. It sits on the right side, and a left join only protects the left.
```

> **Not this:** `FROM employees e, departments d WHERE d.id = e.department_id`. It is the old pre-1992 style: the comma pairs every row with every row, then `WHERE` filters. It behaves like an inner join, so Ben vanishes, and the join condition hides among your other filters. Forget the condition and you get every employee times every department.

```quiz
q: employees LEFT JOIN departments. Which rows can disappear?
options:
  - employees with no department
  - departments with no employees
  - nothing, a left join keeps everything
answer: 1
why: A left join keeps every left row (employees) and only the matching right rows, so an empty department never shows up.
```

## Your turn

Open `query.sql`. It uses an `INNER JOIN`, and the tests fail because one employee goes missing.

List **every** employee, including those with no department.

- Columns, in this order: `employee`, `department` (NULL when there is none)
- Sort by the employee's `id`
- The tests run it on two datasets, so no hardcoding

```hint
Ask the join question: which rows disappear right now, and why?
```

```hint
The employee with a NULL department_id has no partner. Which join keeps every row of the left table?
```

```hint
Change INNER JOIN to LEFT JOIN, keep employees on the left, and ORDER BY e.id.
```
