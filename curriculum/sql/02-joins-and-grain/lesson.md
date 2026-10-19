---
title: Joins and grain
lang: sql
minutes: 20
level: junior
roles: [backend, analyst]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/queries-table-expressions.html
  - https://www.postgresql.org/docs/current/functions-aggregate.html
  - https://dev.mysql.com/doc/refman/8.4/en/join.html
---

## One row per what?

Before you write a join, say the **grain**: one row per *what*?

- `customers`: one row per customer
- `orders`: one row per order
- `order_items`: one row per item inside an order

Join a coarse table to a fine one and the result has the **fine** grain. Interviewers listen for this sentence before you type.

```narrate
Grain means: one row per what. [[customers]] In the customers table, each row is one customer. [[orders]] In orders, each row is one order, and a customer can have many. [[items]] In order items, each row is one item inside an order. [[finer]] When you join them, the result has the grain of the finest table. Say that out loud before you write the query.
```

```svg Each arrow is one to many. Joining across it gives you the finer grain, so the row count grows
<svg viewBox="0 0 520 150" role="img" aria-label="Three tables and the grain of each">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="customers">
      <rect x="10" y="20" width="140" height="70" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="46" fill="var(--fg)">customers</text>
      <text x="22" y="70" fill="var(--fg-muted)" font-size="12">1 row = 1 customer</text>
    </g>
    <g data-cue="orders">
      <path d="M150 55 L190 55" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="154" y="45" fill="var(--fg-muted)" font-size="11">1:many</text>
      <rect x="190" y="20" width="140" height="70" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="202" y="46" fill="var(--fg)">orders</text>
      <text x="202" y="70" fill="var(--fg-muted)" font-size="12">1 row = 1 order</text>
    </g>
    <g data-cue="items">
      <path d="M330 55 L370 55" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="334" y="45" fill="var(--fg-muted)" font-size="11">1:many</text>
      <rect x="370" y="20" width="140" height="70" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="382" y="46" fill="var(--fg)">order_items</text>
      <text x="382" y="70" fill="var(--fg-muted)" font-size="12">1 row = 1 item</text>
    </g>
    <g data-cue="finer">
      <text x="10" y="125" fill="var(--fg)">join all three: 1 row = 1 item</text>
    </g>
  </g>
</svg>
```

```quiz
q: You join orders to order_items. One row per what is the result?
options:
  - one row per order
  - one row per item
  - one row per customer
answer: 1
why: The finest table wins. An order with three items becomes three rows.
```

## INNER or LEFT?

`INNER JOIN` keeps only rows that match on both sides. `LEFT JOIN` keeps **every** row of the left table. No match? The right-side columns are `NULL`.

Ask: must every customer appear, even one with no orders? Yes, so `LEFT JOIN`.

```sql
SELECT customers.name, orders.total
FROM customers
LEFT JOIN orders ON orders.customer_id = customers.id;
```

```narrate
An inner join keeps only matches. [[matched]] Ava and Ben have orders, so both joins keep them. [[dan]] Dan has no order. [[inner]] An inner join drops Dan completely. [[left]] A left join keeps Dan and fills his order columns with null. Ask yourself: must every customer appear? If yes, use left.
```

```svg INNER drops Dan, LEFT keeps him and fills the order side with NULL
<svg viewBox="0 0 520 190" role="img" aria-label="Inner join drops the unmatched customer, left join keeps it">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="matched">
      <rect x="10" y="15" width="110" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="35" fill="var(--fg)">Ava</text>
      <rect x="10" y="55" width="110" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="75" fill="var(--fg)">Ben</text>
      <path d="M120 30 L390 30" stroke="var(--ok)" stroke-width="2"/>
      <path d="M120 70 L390 70" stroke="var(--ok)" stroke-width="2"/>
      <rect x="390" y="15" width="120" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="402" y="35" fill="var(--fg)">total 40</text>
      <rect x="390" y="55" width="120" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="402" y="75" fill="var(--fg)">total 60</text>
    </g>
    <g data-cue="dan">
      <rect x="10" y="95" width="110" height="30" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="22" y="115" fill="var(--fg)">Dan</text>
      <path d="M120 110 L390 110" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <rect x="390" y="95" width="120" height="30" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="402" y="115" fill="var(--danger)">NULL</text>
    </g>
    <g data-cue="inner">
      <text x="10" y="153" fill="var(--fg)">INNER: Dan is dropped</text>
    </g>
    <g data-cue="left">
      <text x="10" y="177" fill="var(--fg)">LEFT: Dan stays, total is NULL</text>
    </g>
  </g>
</svg>
```

> **Trap:** `WHERE orders.total > 30` on the right table deletes the NULL rows, so your `LEFT JOIN` quietly becomes an `INNER JOIN`. Put that filter in `ON`.

> **Why:** Postgres applies `ON` *before* the outer join adds its NULL rows, and `WHERE` *after*. MySQL behaves the same, but has no `FULL JOIN`.

## The fan-out trap

Ava has one order, total 40, with three items. Join orders to items and that order becomes **three rows**. `SUM(orders.total)` now adds 40 three times.

Nothing errors. The number is just too big.

```sql
SELECT SUM(orders.total)
FROM orders
JOIN order_items ON order_items.order_id = orders.id;
```

```narrate
Here is the trap. [[one]] Ava has one order with a total of forty. [[many]] But that order has three items, so the join copies the order row three times, once per item. [[sum]] Now the sum adds forty three times and reports one hundred twenty. No error, just a wrong number that looks fine.
```

```svg The join copies the order row once per item, so SUM counts the same 40 three times
<svg viewBox="0 0 520 190" role="img" aria-label="One order row copied three times by the join">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="one">
      <rect x="10" y="65" width="130" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="86" fill="var(--fg)">order 1</text>
      <text x="22" y="106" fill="var(--fg)">total 40</text>
    </g>
    <g data-cue="many">
      <path d="M140 90 L185 40" stroke="var(--accent-2)" stroke-width="2"/>
      <path d="M140 90 L185 90" stroke="var(--accent-2)" stroke-width="2"/>
      <path d="M140 90 L185 140" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="185" y="22" width="190" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="195" y="45" fill="var(--fg)">order 1 pen  total 40</text>
      <rect x="185" y="72" width="190" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="195" y="95" fill="var(--fg)">order 1 ink  total 40</text>
      <rect x="185" y="122" width="190" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="195" y="145" fill="var(--fg)">order 1 pad  total 40</text>
    </g>
    <g data-cue="sum">
      <rect x="395" y="55" width="115" height="60" fill="none" stroke="var(--danger)" stroke-width="2"/>
      <text x="405" y="78" fill="var(--danger)">SUM = 120</text>
      <text x="405" y="102" fill="var(--fg-muted)" font-size="12">should be 40</text>
    </g>
  </g>
</svg>
```

> **Trap:** revenue too high after a join is almost always a fan-out. Check `COUNT(*)` before and after the join. If it grew, the join multiplied rows.

## Aggregate to the grain first

Shrink the many side to **one row per join key** before you join.

```sql
WITH units_per_order AS (
  SELECT order_id, SUM(quantity) AS units
  FROM order_items
  GROUP BY order_id
)
SELECT orders.id, orders.total, units_per_order.units
FROM orders
LEFT JOIN units_per_order ON units_per_order.order_id = orders.id;
```

> **Why:** `units_per_order` has one row per order, so joining it to `orders` is one to one. Nothing can multiply.

> **Not this:** `SUM(DISTINCT orders.total)`. Two different orders that both total 12 collapse into one, and you lose money silently.

```narrate
The fix is to shrink the many side first. Group the items so there is one row per order, and only then join. Now each order matches exactly one row, so nothing is copied. Distinct looks like a shortcut, but it also merges two different orders that happen to share a total.
```

```quiz
q: orders has 3 rows. order_items has 10 rows, spread across those 3 orders. After you group order_items by order_id and LEFT JOIN it to orders, how many rows do you get?
options:
  - 3
  - 10
  - 13
answer: 0
why: The grouped table has one row per order, so each order matches one row. Grouping first removes the multiplication.
```

## Your turn

The query in `query.sql` runs, but the numbers are wrong and some customers are missing. Fix it.

One row per customer:

- Columns, in this order: `name`, `revenue` (sum of order totals), `units` (sum of item quantities)
- Customers with no orders stay, with 0 and 0
- An order with no items still counts its revenue
- Sort: `revenue` descending, then `name`
- The tests run it on two datasets, so no hardcoding

```hint
Say the grain of each table out loud. Which two disagree, and which column gets repeated?
```

```hint
Group order_items into a CTE with one row per order before you join it.
```

```hint
Use LEFT JOIN twice, then COALESCE(SUM(...), 0) so a customer with nothing shows 0 instead of NULL.
```
