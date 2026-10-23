---
title: A Table Is Rows and Columns
lang: sql
minutes: 12
level: junior
roles: [backend, analyst, ai]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/tutorial-select.html
  - https://www.postgresql.org/docs/current/queries-select-lists.html
  - https://www.postgresql.org/docs/current/sql-syntax-lexical.html
---

## A table is a strict spreadsheet

A **table** looks like a spreadsheet, with stricter rules.

- A **column** is a named slot with a fixed **type**: `int` holds whole numbers, `text` holds words. Every row has the same columns
- A **row** is one record, here one employee
- A **cell** is where a row meets a column. It holds one value of that column's type

The table is fixed **sideways** (columns are decided when it is created) and grows **downwards** (rows come and go all day).

```svg The columns are fixed and typed, each row is one employee, each cell holds one value of its column's type
<svg viewBox="0 0 520 200" role="img" aria-label="The employees table as a grid of typed columns and rows">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="columns">
      <rect x="20" y="20" width="480" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="38" fill="var(--fg)">id</text>
      <text x="90" y="38" fill="var(--fg)">name</text>
      <text x="200" y="38" fill="var(--fg)">department</text>
      <text x="360" y="38" fill="var(--fg)">salary</text>
      <text x="30" y="56" fill="var(--fg-muted)">int</text>
      <text x="90" y="56" fill="var(--fg-muted)">text</text>
      <text x="200" y="56" fill="var(--fg-muted)">text</text>
      <text x="360" y="56" fill="var(--fg-muted)">int</text>
    </g>
    <g data-cue="row">
      <rect x="20" y="68" width="480" height="30" fill="var(--surface-3)" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="30" y="88" fill="var(--fg)">1</text>
      <text x="90" y="88" fill="var(--fg)">Dana</text>
      <text x="200" y="88" fill="var(--fg)">engineering</text>
    </g>
    <g data-cue="cell">
      <rect x="350" y="70" width="90" height="26" fill="var(--surface-2)" stroke="var(--primary)" stroke-width="2"/>
      <text x="360" y="88" fill="var(--fg)">9000</text>
    </g>
    <g data-cue="more">
      <rect x="20" y="102" width="480" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="122" fill="var(--fg)">2</text>
      <text x="90" y="122" fill="var(--fg)">Omer</text>
      <text x="200" y="122" fill="var(--fg)">engineering</text>
      <text x="360" y="122" fill="var(--fg)">8000</text>
      <rect x="20" y="136" width="480" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="156" fill="var(--fg)">3</text>
      <text x="90" y="156" fill="var(--fg)">Noa</text>
      <text x="200" y="156" fill="var(--fg)">sales</text>
      <text x="360" y="156" fill="var(--fg)">6000</text>
      <text x="30" y="188" fill="var(--fg-muted)">rows keep coming</text>
    </g>
  </g>
</svg>
```

```narrate
This is the employees table. [[columns]] Across the top are four columns, each with a name and a type, like integer or text. [[row]] Each line below is a row, one employee. [[cell]] Where Dana's row meets the salary column sits one cell, holding nine thousand. [[more]] New rows can be added any time, but the columns stay the same.
```

> **Why:** the fixed types are what let the database check your data. You cannot put the word "lots" into `salary`, so every salary can be added, compared and averaged safely.

## SELECT picks columns

A query reads like a sentence: **SELECT** these columns **FROM** that table.

```sql
SELECT name, department
FROM employees;
```

- The **select list** (`name, department`) is a comma-separated list of what you want back
- `FROM employees` says which table to read
- You get every row, but only the columns you named, in the order you named them

The output is a new, temporary table. It is never saved, it only answers the question.

```narrate
Read a query like a sentence. Select these columns, from that table. The list after select is called the select list. You get back every row, but only the columns you named, in the order you wrote them. The answer is a fresh table that lives just long enough to be read.
```

## Name your columns

`SELECT *` means "every column". Fine for a quick look, risky in real code.

```sql
SELECT * FROM employees;
```

> **Not this:** `SELECT *` in application code. When someone adds a column to the table, your result changes shape without warning, and code that expected four columns breaks. It also ships data nobody uses, such as a large `notes` column, across the network on every call. The PostgreSQL tutorial calls it bad style in production code.

Listing columns is a contract: this query returns exactly these columns, whatever happens to the table.

```narrate
Select star means give me every column. It is handy for a quick look. In real code it is a trap. If someone adds a column to the table, your query quietly returns a different shape, and the code reading it can break. It also sends data nobody needs. Naming the columns makes the result a stable promise.
```

```quiz
q: A teammate adds a column called notes to employees. Which query keeps returning exactly the same columns?
options:
  - SELECT * FROM employees
  - SELECT name, department FROM employees
  - both return the same columns as before
answer: 1
why: The star expands to whatever columns exist today, so it now includes notes. A named list stays fixed.
```

## Rename and compute with AS

The select list can hold **expressions**, not just column names. Each one is computed once per row.

```sql
SELECT name,
       salary * 12 AS yearly_salary
FROM employees;
```

- `salary * 12` multiplies each row's monthly salary
- `AS yearly_salary` gives the output column a clear name. Without it, PostgreSQL invents one, such as `?column?`

Quotes have two jobs, so keep them apart:

- **Single quotes** are text values: `'sales'`
- **Names** of tables and columns go bare: `department`, not `'department'`

> **Trap:** `SELECT 'name' FROM employees` returns the word "name" on every row, not the names.

```narrate
The select list can also calculate. Salary times twelve is worked out for every row. As yearly salary gives that new column a readable name. Watch the quotes. Single quotes mean a text value, like the word sales. Names of columns and tables are written without quotes.
```

```quiz
q: What does SELECT 'department' FROM employees return?
options:
  - each employee's department
  - the text department on every row
  - an error
answer: 1
why: Single quotes make a text value, so every row gets the same word. Column names are written without quotes.
```

## Say your SELECT list out loud

In an interview, the select list is the first thing the interviewer reads. It shows whether you understood **what the question asks for**.

Before writing anything, say it:

- "The output needs name, department and a yearly salary"
- "Yearly salary is not stored, so I compute salary times 12 and name it"
- "I list the columns instead of using star, so the shape stays stable"

That takes ten seconds and shows you think about the result before the syntax.

```narrate
In an interview, the select list is the first thing read. Say it before you type. Name the columns the answer needs, say which ones you will compute and why, and mention that you list them instead of using star. Ten seconds of talking shows you design the result first.
```

## Your turn

Open `query.sql`. It uses `SELECT *`, which returns the wrong columns. Rewrite it so it returns, for every employee:

- Columns, in this order: `name`, `department`, `yearly_salary`
- `yearly_salary` is `salary * 12`
- Keep `ORDER BY id` at the end. Without it, the database may return rows in any order. Sorting gets its own lesson soon

The tests run it on two different tables, so no hardcoding.

```hint
Replace the star with a comma-separated list of the columns you want, in the order asked.
```

```hint
The third item is an expression, not a stored column: salary times 12. Give it a name with AS.
```

```hint
SELECT name, department, salary * 12 AS yearly_salary FROM employees ORDER BY id;
```
