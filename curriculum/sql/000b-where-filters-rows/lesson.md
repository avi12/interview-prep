---
title: WHERE filters rows
lang: sql
minutes: 12
level: junior
roles: [backend, analyst, ai]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/queries-table-expressions.html
  - https://www.postgresql.org/docs/current/functions-comparison.html
  - https://www.postgresql.org/docs/current/functions-comparisons.html
  - https://www.postgresql.org/docs/current/functions-matching.html
  - https://www.postgresql.org/docs/current/sql-syntax-lexical.html
---

## WHERE keeps the true rows

`WHERE` holds a **condition**: a yes or no question asked of every row. A row stays only when the answer is **true**. Everything else is dropped before you ever see it.

```sql
SELECT name, salary
FROM employees
WHERE salary >= 6000;
```

```svg Every row is tested against the condition; true rows pass, the rest are dropped
<svg viewBox="0 0 520 220" role="img" aria-label="Rows passing through a WHERE filter">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="rows">
      <rect x="20" y="20" width="150" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="40" fill="var(--fg)">Dana  9000</text>
      <rect x="20" y="54" width="150" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="74" fill="var(--fg)">Omer  5000</text>
      <rect x="20" y="88" width="150" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="108" fill="var(--fg)">Noa   8000</text>
      <rect x="20" y="122" width="150" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="142" fill="var(--fg)">Yael  4000</text>
    </g>
    <g data-cue="gate">
      <path d="M180 86 L222 86" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <rect x="226" y="20" width="12" height="132" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="196" y="14" fill="var(--fg-muted)">salary &gt;= 6000 ?</text>
    </g>
    <g data-cue="kept">
      <path d="M244 52 L296 52" stroke="var(--ok)" stroke-width="2" fill="none"/>
      <rect x="300" y="20" width="150" height="30" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="310" y="40" fill="var(--fg)">Dana  9000</text>
      <rect x="300" y="54" width="150" height="30" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="310" y="74" fill="var(--fg)">Noa   8000</text>
      <text x="300" y="104" fill="var(--ok)">true: kept</text>
    </g>
    <g data-cue="dropped">
      <path d="M232 156 L232 176" stroke="var(--danger)" stroke-width="2" fill="none"/>
      <text x="20" y="200" fill="var(--danger)">false: dropped   Omer 5000   Yael 4000</text>
    </g>
  </g>
</svg>
```

```narrate
[[rows]] Four employees come in from the table. [[gate]] Where asks each one the same question: is the salary at least six thousand? [[kept]] Dana and Noa answer true, so they pass through. [[dropped]] Omer and Yael answer false, and they never reach the result.
```

> **Why:** filtering in the database means only the rows you need travel to your app. Fetching everything and filtering in code wastes memory and network.

## Comparing values

| Operator | Means | Example |
|---|---|---|
| `=` | equal | `department = 'sales'` |
| `<>` | not equal | `department <> 'sales'` |
| `<` `>` | less, greater | `salary < 5000` |
| `<=` `>=` | or equal | `salary >= 6000` |

Text goes in **single quotes**: `'sales'`. Numbers need no quotes.

> **Not this:** `department = "sales"`. Double quotes mean a column name in Postgres, so it fails with "column sales does not exist".

`NULL` (a missing value) never equals anything, not even another `NULL`. It gets its own lesson later (03-null-and-aggregates).

```narrate
Six comparison operators cover almost everything. Equals, not equal written as less than and greater than together, and the four size checks. Text values go in single quotes. Double quotes mean a column name, which is a classic beginner error. Missing values, called null, never equal anything. They get their own lesson later.
```

## AND binds before OR

"Engineering or data people earning at least 6000." The natural first try:

```sql
WHERE department = 'engineering' OR department = 'data' AND salary >= 6000
```

`AND` is evaluated **before** `OR`, the way multiplication goes before addition. So Postgres reads it differently than you said it.

```svg Without parentheses the salary check only guards data; with them it guards both departments
<svg viewBox="0 0 520 170" role="img" aria-label="How AND and OR group">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="wrong">
      <text x="20" y="22" fill="var(--danger)">what Postgres reads</text>
      <rect x="20" y="32" width="120" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="30" y="53" fill="var(--fg)">engineering</text>
      <text x="150" y="53" fill="var(--fg)">OR</text>
      <rect x="180" y="32" width="230" height="32" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="190" y="53" fill="var(--fg)">data AND salary &gt;= 6000</text>
    </g>
    <g data-cue="right">
      <text x="20" y="98" fill="var(--ok)">what you meant</text>
      <rect x="20" y="108" width="220" height="32" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="129" fill="var(--fg)">engineering OR data</text>
      <text x="250" y="129" fill="var(--fg)">AND</text>
      <rect x="290" y="108" width="140" height="32" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="300" y="129" fill="var(--fg)">salary &gt;= 6000</text>
    </g>
  </g>
</svg>
```

```narrate
[[wrong]] Without parentheses, and grabs its neighbours first. The salary check is glued to data only, so every engineer passes, whatever they earn. [[right]] With parentheses around the two departments, the salary check guards both of them.
```

> **Trap:** with Omer, engineering, 5000, the first query returns him. He earns too little, but the salary check never looked at him. Write `(department = 'engineering' OR department = 'data') AND salary >= 6000`.

## Shortcuts: IN, BETWEEN, LIKE

```sql
WHERE department IN ('engineering', 'data')   -- same as = ... OR = ...
WHERE salary BETWEEN 5000 AND 8000            -- 5000 and 8000 both count
WHERE name LIKE 'Da%'                         -- Dana, Dafna, Dan
WHERE name LIKE '_al'                         -- Tal, Gal
WHERE name ILIKE 'da%'                        -- also DANA, dana
```

- `IN` is a short list of equals joined by `OR`, and it cannot be misgrouped
- `BETWEEN a AND b` means `>= a AND <= b`: **inclusive** on both ends
- `LIKE` must match the whole text. `%` is any run of characters, even none. `_` is exactly one
- `ILIKE` ignores upper and lower case. It is Postgres only

```narrate
In is a list of allowed values, a tidy way to write several equals joined by or. Between includes both ends. Like matches a pattern: percent means any number of characters, underscore means exactly one. I like, spelled with an i in front, does the same but ignores case, and only Postgres has it.
```

```quiz
q: Salaries are 5000, 6000, 8000 and 9000. How many rows does WHERE salary BETWEEN 6000 AND 8000 keep?
options:
  - 1
  - 2
  - 3
answer: 1
why: BETWEEN includes both ends, so 6000 and 8000 stay and only 5000 and 9000 drop.
```

## Say it in words first

Interviewers watch how you turn a sentence into a condition. Before typing, say the filter out loud:

- "department is engineering **or** data"
- "**and** salary is at least 6000"

Each spoken "and" or "or" maps to one operator, and the grouping you hear is where the parentheses go. Then check the edges: does "at least" mean `>=` or `>`?

```narrate
Before you type, say the filter in plain words. Department is engineering or data, and salary is at least six thousand. The grouping you hear tells you where the parentheses go. Then check the edges out loud: at least means greater than or equal, not just greater than.
```

## Your turn

Open `query.sql`. It has the bug from this lesson. Return people in **engineering or data** who earn **at least 6000**.

- Columns, in this order: `name`, `department`, `salary`
- Sort by `id`
- The tests use two datasets, with low-paid engineers that only the bug lets through

```hint
Run the starter in your head on an engineer earning 5000. Does the salary check ever look at that row?
```

```hint
AND is applied before OR. Group the two department checks so the salary check applies to both.
```

```hint
WHERE (department = 'engineering' OR department = 'data') AND salary >= 6000, or use department IN ('engineering', 'data').
```
