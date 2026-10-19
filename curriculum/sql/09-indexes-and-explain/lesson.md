---
title: Indexes and EXPLAIN
lang: ts
minutes: 30
level: junior
roles: [backend, analyst]
files: [setup.sql]
sources:
  - https://www.postgresql.org/docs/current/indexes-intro.html
  - https://www.postgresql.org/docs/current/indexes-types.html
  - https://www.postgresql.org/docs/current/indexes-multicolumn.html
  - https://www.postgresql.org/docs/current/indexes-expressional.html
  - https://www.postgresql.org/docs/current/using-explain.html
  - https://www.postgresql.org/docs/current/planner-stats.html
  - https://use-the-index-luke.com/sql/where-clause/functions/case-insensitive-search
---

## An index is a sorted shortcut

Without an index, Postgres checks **every row** to answer `WHERE customer_id = 42`. That is a **sequential scan**. Fine on 20,000 rows, painful on 20 million.

An index is a separate, sorted structure. The default kind is a **B-tree**: a small tree where each step narrows the search, so it reaches the matching rows in a few hops.

The price: every `INSERT`, `UPDATE` and `DELETE` must also update each index.

> **Why:** the real interview question is not "what is an index" but "which index, and how do you **prove** it is used?" You prove it with `EXPLAIN`.

```svg Without an index every row is read; a B-tree reaches the matching row in a few hops
<svg viewBox="0 0 520 240" role="img" aria-label="Sequential scan versus B-tree lookup">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="seq">
      <text x="20" y="22" fill="var(--fg-muted)">no index: Seq Scan</text>
      <rect x="20" y="32" width="30" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="54" y="32" width="30" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="88" y="32" width="30" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="122" y="32" width="30" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="156" y="32" width="30" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="190" y="32" width="30" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="224" y="32" width="30" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <rect x="258" y="32" width="30" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="300" y="50" fill="var(--fg)">... all 20000 rows read</text>
    </g>
    <g data-cue="tree">
      <text x="20" y="98" fill="var(--fg-muted)">B-tree index</text>
      <rect x="150" y="108" width="120" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="210" y="127" text-anchor="middle" fill="var(--fg)">root: 700 | 1400</text>
      <path d="M180 136 L90 170 M210 136 L210 170 M240 136 L330 170" stroke="var(--border)" stroke-width="2" fill="none"/>
      <rect x="30" y="170" width="120" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="90" y="189" text-anchor="middle" fill="var(--fg)">1 to 700</text>
      <rect x="150" y="170" width="120" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="210" y="189" text-anchor="middle" fill="var(--fg)">701 to 1400</text>
      <rect x="270" y="170" width="120" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="330" y="189" text-anchor="middle" fill="var(--fg)">1401 to 2000</text>
    </g>
    <g data-cue="hit">
      <path d="M210 198 L210 214" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <text x="20" y="230" fill="var(--fg)">customer 1042 found in 3 hops: root, leaf, row</text>
    </g>
  </g>
</svg>
```

```narrate
Without an index, the database reads every row. [[seq]] Picture all twenty thousand boxes, checked one by one. [[tree]] A B-tree is different. The root says which range to go to, the next level narrows it again. [[hit]] In three hops we reach the row for customer ten forty two. The price is that every write must keep the tree up to date.
```

## Read EXPLAIN: four node names

`EXPLAIN` prints the plan the **planner** chose (the part of Postgres that decides how to run a query), **without running the query**. Read the innermost, most indented line first.

| Node | What it does |
|---|---|
| `Seq Scan` | reads the whole table |
| `Index Scan` | walks the index, then fetches each row |
| `Bitmap Index Scan` + `Bitmap Heap Scan` | collects row locations from the index, then reads table pages in order |
| `Index Only Scan` | answers from the index alone, if it holds every column the query needs |

```
Seq Scan on orders  (cost=0.00..379.00 rows=10 width=21)
  Filter: (customer_id = 42)
```

```
Bitmap Heap Scan on orders  (cost=4.37..36.14 rows=10 width=21)
  Recheck Cond: (customer_id = 42)
  ->  Bitmap Index Scan on orders_customer_idx  (cost=0.00..4.36 rows=10 width=0)
        Index Cond: (customer_id = 42)
```

`cost` is an estimate in made-up units. Use it only to compare plans.

> **Trap:** `EXPLAIN ANALYZE` really **runs** the query. On an `UPDATE` or `DELETE` the rows change for real. Wrap it in `BEGIN ... ROLLBACK`.

```svg Same query, two plans: adding the index drops the estimated cost from 379 to about 36
<svg viewBox="0 0 520 170" role="img" aria-label="Cost before and after adding an index">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="before">
      <text x="20" y="30" fill="var(--fg-muted)">Seq Scan</text>
      <rect x="20" y="40" width="379" height="26" fill="var(--danger)" stroke="var(--border)" stroke-width="2"/>
      <text x="409" y="59" fill="var(--fg)">379</text>
    </g>
    <g data-cue="after">
      <text x="20" y="100" fill="var(--fg-muted)">Bitmap Index Scan</text>
      <rect x="20" y="110" width="36" height="26" fill="var(--ok)" stroke="var(--border)" stroke-width="2"/>
      <text x="66" y="129" fill="var(--fg)">36</text>
    </g>
  </g>
</svg>
```

```narrate
Reading explain takes four names. Sequential scan reads the whole table. Index scan and bitmap scan use the index. Index only scan answers from the index alone. [[before]] Here is the same query without an index, with an estimated cost of three hundred seventy nine. [[after]] With the index, the estimate drops to about thirty six. The numbers are made up units, so only compare them.
```

```quiz
q: You run EXPLAIN ANALYZE on a DELETE statement. What happens to the rows?
options:
  - Nothing, EXPLAIN only plans
  - They are deleted for real
  - They are deleted, then restored automatically
answer: 1
why: ANALYZE executes the statement to measure it, so side effects happen. Wrap it in BEGIN and ROLLBACK when you only want the plan.
```

## Selectivity: why the planner says no

**Selectivity** is the fraction of rows a condition matches.

- `customer_id = 42` matches 10 of 20,000 rows: very selective
- `status = 'paid'` matches 98 %: not selective

For a thin slice, an index wins. For almost everything, one straight read beats thousands of index hops, so the planner picks `Seq Scan` **even when an index exists**.

It knows the fractions from statistics that `ANALYZE` gathers. After a bulk load, run `ANALYZE`.

```svg A tiny matching slice favors the index; a huge one favors reading the table
<svg viewBox="0 0 520 190" role="img" aria-label="Two bars showing matching fractions of the table">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="few">
      <text x="20" y="26" fill="var(--fg-muted)">customer_id = 42</text>
      <rect x="20" y="36" width="400" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="20" y="36" width="2" height="26" fill="var(--ok)"/>
      <text x="20" y="84" fill="var(--fg)">10 rows of 20000: use the index</text>
    </g>
    <g data-cue="most">
      <text x="20" y="116" fill="var(--fg-muted)">status = 'paid'</text>
      <rect x="20" y="126" width="400" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <rect x="20" y="126" width="392" height="26" fill="var(--danger)"/>
      <text x="20" y="174" fill="var(--fg)">19600 rows: just scan the table</text>
    </g>
  </g>
</svg>
```

```narrate
Selectivity is the share of rows a condition matches. [[few]] Customer forty two matches ten rows out of twenty thousand. A sliver, so the index wins. [[most]] Status paid matches almost every row. Hopping through an index for all of them is slower than one straight read, so the planner ignores the index. That is not a bug, it is arithmetic.
```

> **Not this:** index every column, or flags like `status`. Each index slows every write, and the planner will not use the low-selectivity ones anyway.

## Composite indexes: column order

A **composite index** sorts by the first column, then by the second inside it, like a phone book: last name, then first name.

```sql
CREATE INDEX orders_customer_created_idx ON orders (customer_id, created_at);
```

It helps when the query fixes the **leading** column. Both `WHERE customer_id = 42` and `WHERE customer_id = 42 AND created_at >= ...` can use it. A query on `created_at` alone cannot jump in. (Postgres 18 can skip through the first column, but only when it has few distinct values.)

> **Why:** equality columns first, the range column last. One composite index also replaces a separate index on its first column.

> **Not this:** `(created_at, customer_id)`. In our test data the planner chose a full table scan for `customer_id = 42` with that order.

```svg The same nine entries sorted two ways: customer 2 is one block in the left index and scattered in the right one
<svg viewBox="0 0 520 240" role="img" aria-label="Composite index order">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="good">
      <text x="20" y="20" fill="var(--fg)">(customer_id, created_at)</text>
      <rect x="20" y="30" width="190" height="20" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="30" y="45" fill="var(--fg)">1  Jan</text>
      <rect x="20" y="52" width="190" height="20" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="30" y="67" fill="var(--fg)">1  Feb</text>
      <rect x="20" y="74" width="190" height="20" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="30" y="89" fill="var(--fg)">1  Mar</text>
      <rect x="20" y="96" width="190" height="20" fill="var(--primary-container)" stroke="var(--border)"/>
      <text x="30" y="111" fill="var(--fg)">2  Jan</text>
      <rect x="20" y="118" width="190" height="20" fill="var(--primary-container)" stroke="var(--border)"/>
      <text x="30" y="133" fill="var(--fg)">2  Feb</text>
      <rect x="20" y="140" width="190" height="20" fill="var(--primary-container)" stroke="var(--border)"/>
      <text x="30" y="155" fill="var(--fg)">2  Mar</text>
      <rect x="20" y="162" width="190" height="20" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="30" y="177" fill="var(--fg)">3  Jan</text>
      <rect x="20" y="184" width="190" height="20" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="30" y="199" fill="var(--fg)">3  Feb</text>
      <rect x="20" y="206" width="190" height="20" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="30" y="221" fill="var(--fg)">3  Mar</text>
      <text x="222" y="130" fill="var(--ok)">one block</text>
    </g>
    <g data-cue="bad">
      <text x="300" y="20" fill="var(--fg)">(created_at, customer_id)</text>
      <rect x="300" y="30" width="190" height="20" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="310" y="45" fill="var(--fg)">Jan  1</text>
      <rect x="300" y="52" width="190" height="20" fill="var(--primary-container)" stroke="var(--border)"/>
      <text x="310" y="67" fill="var(--fg)">Jan  2</text>
      <rect x="300" y="74" width="190" height="20" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="310" y="89" fill="var(--fg)">Jan  3</text>
      <rect x="300" y="96" width="190" height="20" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="310" y="111" fill="var(--fg)">Feb  1</text>
      <rect x="300" y="118" width="190" height="20" fill="var(--primary-container)" stroke="var(--border)"/>
      <text x="310" y="133" fill="var(--fg)">Feb  2</text>
      <rect x="300" y="140" width="190" height="20" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="310" y="155" fill="var(--fg)">Feb  3</text>
      <rect x="300" y="162" width="190" height="20" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="310" y="177" fill="var(--fg)">Mar  1</text>
      <rect x="300" y="184" width="190" height="20" fill="var(--primary-container)" stroke="var(--border)"/>
      <text x="310" y="199" fill="var(--fg)">Mar  2</text>
      <rect x="300" y="206" width="190" height="20" fill="var(--surface-2)" stroke="var(--border)"/>
      <text x="310" y="221" fill="var(--fg)">Mar  3</text>
    </g>
  </g>
</svg>
```

```narrate
The same nine entries, sorted two ways. [[good]] On the left the index starts with the customer. All the rows for customer two sit together in one block, so the database jumps straight there. [[bad]] On the right the index starts with the date. The rows for customer two are scattered across the whole list, so there is nowhere to jump to.
```

## Why your index is ignored

The planner matches your query to the index **exactly**. Change the column even slightly and the index no longer applies.

| Query | Why it is skipped | Fix |
|---|---|---|
| `WHERE lower(email) = 'a@b.c'` | the index holds `email`, not `lower(email)` | `CREATE INDEX ON users (lower(email))` |
| `WHERE created_at::date = '2025-01-01'` | a function wraps the column | `created_at >= '2025-01-01' AND created_at < '2025-01-02'` |
| `WHERE total_cents * 2 > 100` | math on the column | move the math to the constant: `total_cents > 50` |
| `WHERE email LIKE '%@x.com'` | a leading wildcard has no sorted start | rethink the search |
| `WHERE status = 'paid'` | low selectivity | nothing, scanning is right |

> **Trap:** an index on `email` does not serve `lower(email)`. An index on an expression serves only that exact expression.

```narrate
Most ignored indexes come from one habit: wrapping the column in something. Lower of email, a cast to date, or math on the column. The index is sorted by the raw value, so the planner cannot use it. Either index the exact expression, or rewrite the condition so the column stands alone.
```

```quiz
q: created_at is a timestamp with a plain B-tree index. Which condition can use it?
options:
  - WHERE created_at::date = '2025-01-01'
  - WHERE created_at >= '2025-01-01' AND created_at < '2025-01-02'
  - WHERE date_trunc('day', created_at) = '2025-01-01'
answer: 1
why: The column stands alone, compared with plain operators. The other two wrap it in a cast or function, which the plain index cannot match.
```

## Your turn

`users` and `orders` are loaded (20,000 rows each). Write `CREATE INDEX` statements in `setup.sql` so these queries use an index:

1. `SELECT * FROM users WHERE lower(email) = 'user777@example.com'`
2. `SELECT * FROM orders WHERE customer_id = 42`
3. `SELECT * FROM orders WHERE customer_id = 42 AND created_at >= DATE '2025-01-01'`

Rules:

- At most **two** indexes beyond the primary keys, and none on `status`
- The tests load the data, run your file, run `ANALYZE`, then read `EXPLAIN (FORMAT JSON)`. Any index node counts: Index Scan, Index Only Scan or Bitmap Index Scan

```hint
Query 1 wraps the column in lower(). Index the expression itself, not the plain column.
```

```hint
Queries 2 and 3 can share one composite index. Equality column first, range column second.
```

```hint
CREATE INDEX users_email_lower_idx ON users (lower(email)); and a second index on orders (customer_id, created_at).
```
