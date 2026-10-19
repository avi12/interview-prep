---
title: CTEs and subqueries
lang: sql
minutes: 25
level: junior
roles: [backend, analyst]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/queries-with.html
  - https://www.postgresql.org/docs/current/sql-select.html
  - https://www.postgresql.org/docs/current/functions-subquery.html
  - https://dev.mysql.com/doc/refman/8.4/en/with.html
  - https://dev.mysql.com/doc/refman/8.4/en/derived-table-optimization.html
---

## Give each step a name

A **CTE** (common table expression) is a named step: `WITH name AS (...)`. Later steps can read earlier ones, so a query reads top to bottom like a recipe.

```sql
WITH customer_totals AS (
  SELECT customer, SUM(amount) AS total
  FROM payments
  GROUP BY customer
)
SELECT customer, total
FROM customer_totals
WHERE total > 100;
```

> **Why:** a name explains the step, and you can run any CTE alone to debug it. The same query as a nested subquery works, but you must read it inside out.

```narrate
A common table expression gives a step a name. [[totals]] The first step adds up payments per customer. [[average]] The second step reads the first one and takes the average of those totals. [[final]] The last query only compares each customer to that average. Read it from top to bottom, like a recipe, instead of digging into nested brackets from the inside out.
```

```svg Each CTE reads the one before it. The final query only compares
<svg viewBox="0 0 520 130" role="img" aria-label="Payments flow through two CTEs into the final query">
  <g font-family="var(--font-mono)" font-size="12">
    <rect x="0" y="30" width="96" height="56" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="10" y="54" fill="var(--fg)">payments</text>
    <text x="10" y="72" fill="var(--fg-muted)" font-size="10">1 row = 1 payment</text>
    <g data-cue="totals">
      <path d="M96 58 L120 58" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="120" y="30" width="136" height="56" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="130" y="54" fill="var(--fg)">customer_totals</text>
      <text x="130" y="72" fill="var(--fg-muted)" font-size="10">1 row = 1 customer</text>
    </g>
    <g data-cue="average">
      <path d="M256 58 L280 58" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="280" y="30" width="126" height="56" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="290" y="54" fill="var(--fg)">average_total</text>
      <text x="290" y="72" fill="var(--fg-muted)" font-size="10">1 row = the average</text>
    </g>
    <g data-cue="final">
      <path d="M406 58 L430 58" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="430" y="30" width="90" height="56" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="440" y="54" fill="var(--fg)">result</text>
      <text x="440" y="72" fill="var(--fg-muted)" font-size="10">above avg</text>
    </g>
  </g>
</svg>
```

## Correlated subquery or join?

A **correlated** subquery uses a column of the outer row, so it runs again for every outer row.

```sql
SELECT name FROM employees AS outer_row
WHERE salary > (
  SELECT AVG(salary) FROM employees
  WHERE department = outer_row.department
);
```

The join version groups once, then joins once.

| 2,000 employees, 20 departments | Postgres 18 plan | Estimated cost |
|---|---|---|
| correlated | Seq Scan plus a SubPlan per row | about 76,000 |
| join to grouped CTE | Hash Join | about 82 |

> **Not this:** a correlated aggregate for "above their group's average" on a big table. `EXISTS` and `IN` are different: the planner turns those into joins.

```narrate
A correlated subquery uses a column from the outer query. [[outer]] So for every outer row, [[perrow]] the database runs the inner query again with that row's department. Two thousand rows means two thousand runs. [[once]] The join version groups once, builds one small table of averages, and joins it once. Same answer, far less work.
```

```svg Correlated: the inner query runs once per outer row. Join: group once, join once
<svg viewBox="0 0 520 195" role="img" aria-label="Correlated subquery runs per row, join groups once">
  <g font-family="var(--font-mono)" font-size="12">
    <text x="10" y="16" fill="var(--fg-muted)">correlated subquery</text>
    <g data-cue="outer">
      <rect x="10" y="26" width="100" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="43" fill="var(--fg)">row 1</text>
      <rect x="10" y="58" width="100" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="75" fill="var(--fg)">row 2</text>
      <rect x="10" y="90" width="100" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="107" fill="var(--fg)">row 3</text>
    </g>
    <g data-cue="perrow">
      <path d="M110 39 L190 39 M110 71 L190 71 M110 103 L190 103" stroke="var(--danger)" stroke-width="2"/>
      <rect x="190" y="26" width="190" height="26" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="200" y="43" fill="var(--fg)">AVG of this department</text>
      <rect x="190" y="58" width="190" height="26" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="200" y="75" fill="var(--fg)">AVG of this department</text>
      <rect x="190" y="90" width="190" height="26" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="200" y="107" fill="var(--fg)">AVG of this department</text>
    </g>
    <g data-cue="once">
      <text x="10" y="144" fill="var(--fg-muted)">join to a grouped CTE</text>
      <rect x="10" y="154" width="150" height="28" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="20" y="172" fill="var(--fg)">GROUP BY once</text>
      <path d="M160 168 L200 168" stroke="var(--ok)" stroke-width="2"/>
      <rect x="200" y="154" width="150" height="28" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="210" y="172" fill="var(--fg)">JOIN once</text>
    </g>
  </g>
</svg>
```

```quiz
q: You need every employee paid above their own department's average, on a table with millions of rows. Which is the safer first choice?
options:
  - a correlated subquery in WHERE
  - a join to a CTE that groups by department
  - a DISTINCT on the whole table
answer: 1
why: The grouped CTE computes each average once. The correlated aggregate is re-run for every employee row.
```

## A CTE is not a fence

Old folklore: a CTE is computed first, in full, and the planner cannot see through it. That was true before Postgres 12. Today:

- used **once**, no side effects: folded into the main query
- used **twice or more**: computed once, result reused
- `MATERIALIZED` forces the old fence. `NOT MATERIALIZED` forces folding

```sql
WITH w AS MATERIALIZED (SELECT * FROM employees)
SELECT * FROM w WHERE id = 5;
```

> **Trap:** do not add `MATERIALIZED` "to be safe". On 2,000 rows it turns an Index Scan on `id` into a full read, then a filter. Use it on purpose, such as to run an expensive function once.

MySQL 8.0 and later also merges a CTE into the outer query when it can.

```narrate
There is an old rule that a common table expression is a wall the optimizer cannot see through. Since Postgres twelve, that is mostly false. [[once]] Used once, the step is folded into the main query, so a filter can reach the table and use an index. [[twice]] Used twice, it is computed once and shared. You can force either behavior with the words materialized or not materialized, but do it on purpose.
```

```svg Used once, the CTE melts into the main query. Used twice, it runs once and both uses share it
<svg viewBox="0 0 520 175" role="img" aria-label="CTE folded when used once, shared when used twice">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="once">
      <rect x="10" y="10" width="240" height="150" fill="none" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="32" fill="var(--fg-muted)">used once</text>
      <rect x="25" y="46" width="210" height="36" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="35" y="68" fill="var(--fg)">main query + CTE merged</text>
      <path d="M130 82 L130 108" stroke="var(--ok)" stroke-width="2"/>
      <rect x="25" y="108" width="210" height="36" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="35" y="130" fill="var(--fg)">filter reaches the index</text>
    </g>
    <g data-cue="twice">
      <rect x="270" y="10" width="240" height="150" fill="none" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="32" fill="var(--fg-muted)">used twice</text>
      <rect x="285" y="46" width="210" height="36" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="295" y="68" fill="var(--fg)">CTE computed once</text>
      <path d="M300 82 L300 108 M300 108 L318 100 M300 108 L318 116" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <text x="324" y="114" fill="var(--fg)">use 1</text>
      <path d="M300 82 L300 136 M300 136 L318 128 M300 136 L318 144" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <text x="324" y="142" fill="var(--fg)">use 2</text>
    </g>
  </g>
</svg>
```

> **Why:** since Postgres 12 the planner optimizes across the CTE boundary, so you write CTEs for readability and let the planner choose.

## Which one to reach for

| You want | Reach for |
|---|---|
| A multi-step query a person must read | one CTE per step |
| Compare each row to its group's aggregate | join to a grouped CTE |
| Does a related row exist? | `EXISTS` |
| One value from another table | scalar subquery |

```narrate
Reach for a common table expression when the query has steps you can name, or when one result feeds two places. Reach for a join when you compare each row to a summary of its group. Use exists for yes or no questions about related rows. In an interview, say which one you picked and why. It shows you can read your own query.
```

```quiz
q: In Postgres 12 or later, a side-effect-free CTE is referenced exactly once. What does the planner do by default?
options:
  - computes it fully first and treats it as a wall
  - folds it into the main query
  - refuses to run the query
answer: 1
why: A once-used, side-effect-free CTE is folded into the main query, so filters can be pushed in. MATERIALIZED would force the wall.
```

## Your turn

The starter finds customers whose total is above the average **payment**. That is the wrong average: payments and customers have different grain. Rewrite `query.sql` with **two chained CTEs**.

- First CTE: the total per customer
- Second CTE: reads the first and computes the average of those totals
- Final query: customers whose total is strictly above that average
- Columns, in this order: `customer`, `total`
- Sort: `total` descending, then `customer`
- The tests run two datasets, and check that you wrote two CTEs

```hint
Average over customers, one row each, not over payments. That means the average must read the per-customer totals.
```

```hint
CTE one: SUM(amount) grouped by customer. CTE two: SELECT AVG(total) FROM the first CTE.
```

```hint
CTE two has one row, so the final query can CROSS JOIN it and keep rows where total is strictly greater than the average.
```
