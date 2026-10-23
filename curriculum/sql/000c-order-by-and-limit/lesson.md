---
title: ORDER BY and LIMIT
lang: sql
minutes: 12
level: junior
roles: [backend, analyst, ai]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/queries-order.html
  - https://www.postgresql.org/docs/current/queries-limit.html
  - https://www.postgresql.org/docs/current/sql-select.html
---

## No ORDER BY, no promise

A table is a **bag of rows**, not a list. When you run `SELECT name FROM employees`, the rows come back in whatever order was cheapest for the database that day.

- Today it looks like insert order
- After an update, a new index or more data, it can change

```sql
SELECT name, salary
FROM employees
ORDER BY salary;
```

> **Why:** the PostgreSQL docs say that without sorting, rows come back "in an unspecified order" that depends on the plan and the order on disk, and "must not be relied on". Only `ORDER BY` guarantees an order.

```narrate
A table is a bag of rows, not a list. If you do not ask for an order, the database hands rows back in whatever order was cheapest. It may look stable today and change tomorrow after an update or a new index. The PostgreSQL documentation says it plainly: only order by guarantees an order.
```

## ASC and DESC

`ORDER BY` sorts by a column. Add a direction after it:

- `ASC`: smallest first. This is the **default**, so you can leave it out
- `DESC`: largest first

```sql
SELECT name, salary
FROM employees
ORDER BY salary DESC;
```

Text sorts alphabetically, numbers by size, dates from old to new.

> **Trap:** the direction belongs to **one** column. `ORDER BY salary, name DESC` means salary ascending, name descending.

```narrate
Order by takes a direction. Ascending puts the smallest first, and it is the default, so you can leave it out. Descending puts the largest first. Careful: each direction belongs to one column only, so writing descending at the end does not flip the earlier columns.
```

## Ties need a second key

Three people earn 8000. Sorting by salary says they come after 9000, but **not in which order among themselves**. The database picks, and it may pick differently next time.

Give it a second key. Later keys are only used when the earlier ones are equal.

```sql
ORDER BY salary DESC, name
```

```svg Salary sorts the rows, the tied 8000s stay in an unknown order, the name key settles them, and only then does LIMIT 3 cut
<svg viewBox="0 0 520 230" role="img" aria-label="Rows sorted by salary, ties broken by name, then cut by LIMIT 3">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="key1">
      <text x="20" y="24" fill="var(--fg-muted)">ORDER BY salary DESC</text>
      <rect x="20" y="36" width="180" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="55" fill="var(--fg)">Dana   9000</text>
      <rect x="20" y="68" width="180" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="87" fill="var(--fg)">Zoe    8000</text>
      <rect x="20" y="100" width="180" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="119" fill="var(--fg)">Omer   8000</text>
      <rect x="20" y="132" width="180" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="151" fill="var(--fg)">Lior   8000</text>
      <rect x="20" y="164" width="180" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="183" fill="var(--fg)">Ben    7000</text>
    </g>
    <g data-cue="ties">
      <rect x="14" y="64" width="192" height="100" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="20" y="214" fill="var(--danger)">tie: order not promised</text>
    </g>
    <g data-cue="key2">
      <path d="M212 114 L262 114" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <path d="M254 108 L264 114 L254 120" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <text x="270" y="24" fill="var(--fg-muted)">..., name</text>
      <rect x="270" y="36" width="180" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="55" fill="var(--fg)">Dana   9000</text>
      <rect x="270" y="68" width="180" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="87" fill="var(--fg)">Lior   8000</text>
      <rect x="270" y="100" width="180" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="119" fill="var(--fg)">Omer   8000</text>
      <rect x="270" y="132" width="180" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="151" fill="var(--fg-muted)">Zoe    8000</text>
      <rect x="270" y="164" width="180" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="183" fill="var(--fg-muted)">Ben    7000</text>
    </g>
    <g data-cue="cut">
      <path d="M262 130 L500 130" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="458" y="122" fill="var(--fg)" font-size="12">LIMIT 3</text>
    </g>
  </g>
</svg>
```

```narrate
[[key1]] First the rows are sorted by salary, highest first. Dana leads with nine thousand. [[ties]] But three people earn eight thousand, and salary alone cannot say who goes first among them, so their order is not promised. [[key2]] The second key, name, settles the tie: Lior, Omer, then Zoe. [[cut]] Only now does limit three cut the list, so the same three people come back every time.
```

## LIMIT cuts after sorting

`LIMIT 3` keeps the **first 3 rows of the sorted result**. The sort happens first, the cut second.

```sql
SELECT name, salary
FROM employees
ORDER BY salary DESC, name
LIMIT 3;
```

> **Not this:** `LIMIT 3` with no `ORDER BY`. You get some 3 rows, and the docs call it "an unpredictable subset". It is also wrong with a sort that leaves ties at the cut: who is third becomes a coin flip.

The interview angle: "top 3 earners" is really a question about **ties**. Say out loud how you break them, or ask whether tied people should all be kept.

```narrate
Limit keeps the first rows of the sorted result. Sorting happens first, cutting second. Limit without order by gives you some rows, which the docs call an unpredictable subset. And if ties sit right at the cut, the last place becomes a coin flip. In an interview, top three earners is a question about ties, so say how you break them.
```

```quiz
q: Salaries are 9000, 8000, 8000, 8000. Which rows does ORDER BY salary DESC LIMIT 2 return?
options:
  - the 9000 and the alphabetically first 8000
  - the 9000 and any one of the 8000s, possibly a different one next run
  - all four rows, because ties are kept
answer: 1
why: Nothing orders the tied 8000s, so the database may pick any of them; add name as a second key to make it fixed.
```

## OFFSET for pages

`OFFSET n` skips n rows, then `LIMIT` counts. Page 3 with 10 rows per page:

```sql
SELECT name, salary
FROM employees
ORDER BY salary DESC, name
LIMIT 10 OFFSET 20;
```

Paging needs a **unique** order, or a tied row can show up on two pages, or on none.

Big offsets get slow: the skipped rows are still read and thrown away. A faster method, keyset paging, comes in a later lesson.

```narrate
Offset skips rows before limit starts counting. Page three, with ten rows per page, skips twenty. Paging needs an order with no ties, or a row can appear on two pages or vanish. Large offsets are slow, because the database still reads every skipped row and throws it away. A faster method, keyset paging, comes later.
```

## Your turn

Open `query.sql` and write one query on `employees`. Return the **3 highest-paid people**.

- Columns, in this order: `name`, `salary`
- Highest salary first
- Ties broken by `name`, alphabetically
- The tests use two datasets with ties right at the cut, so a missing tie-breaker fails

```hint
Run the starter and compare: is the order fully decided when two people earn the same?
```

```hint
Add a second sort key after salary. Later keys only matter when earlier ones are equal.
```

```hint
ORDER BY salary DESC, name, then LIMIT 3.
```
