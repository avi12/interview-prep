---
title: Anti-joins and the NOT IN trap
lang: sql
minutes: 20
level: junior
roles: [backend, analyst]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/functions-subquery.html
  - https://www.postgresql.org/docs/current/queries-table-expressions.html
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This
  - https://dev.mysql.com/doc/refman/8.4/en/comparison-operators.html
  - https://dev.mysql.com/doc/refman/8.4/en/semijoins-antijoins.html
---

## Who has none?

An **anti-join** returns the rows of one table that have **no match** in another.

- customers with no paid order
- products that never sold
- users who never logged in

SQL has no `ANTI JOIN` keyword. You write it in one of three ways, and one of them is a trap.

```narrate
An anti join returns the rows that have no match. [[matched]] Ava and Cleo each have a paid order, so they are out. [[none]] Ben and Dan have no paid order, so they are the answer. [[guest]] Notice the guest order. It belongs to no customer, because its customer id is null. Remember that. It matters two cards from now.
```

```svg Keep the customers with no line to a paid order. The guest order belongs to nobody
<svg viewBox="0 0 520 175" role="img" aria-label="Customers, paid orders, and the unmatched customers highlighted">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="matched">
      <rect x="10" y="15" width="110" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="35" fill="var(--fg)">Ava</text>
      <rect x="10" y="89" width="110" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="109" fill="var(--fg)">Cleo</text>
      <path d="M120 30 L350 30 M120 104 L350 104" stroke="var(--ok)" stroke-width="2"/>
      <rect x="350" y="15" width="160" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="360" y="35" fill="var(--fg)">paid order</text>
      <rect x="350" y="89" width="160" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="360" y="109" fill="var(--fg)">paid order</text>
    </g>
    <g data-cue="none">
      <rect x="10" y="52" width="110" height="30" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="3"/>
      <text x="22" y="72" fill="var(--fg)">Ben</text>
      <rect x="10" y="126" width="110" height="30" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="3"/>
      <text x="22" y="146" fill="var(--fg)">Dan</text>
      <text x="140" y="72" fill="var(--accent-2)">no line = keep</text>
      <text x="140" y="146" fill="var(--accent-2)">no line = keep</text>
    </g>
    <g data-cue="guest">
      <rect x="350" y="52" width="160" height="42" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="360" y="70" fill="var(--fg)">guest order</text>
      <text x="360" y="86" fill="var(--danger)" font-size="11">customer_id NULL</text>
    </g>
  </g>
</svg>
```

## Three ways to write it

| Form | NULL in the subquery | Postgres 18 plan |
|---|---|---|
| `WHERE NOT EXISTS (SELECT 1 FROM orders WHERE ...)` | safe | Hash Anti Join |
| `LEFT JOIN orders ON ... WHERE orders.id IS NULL` | safe | Hash Join, then filter |
| `WHERE id NOT IN (SELECT customer_id FROM orders)` | **zero rows** | hashed SubPlan, never an anti join |

```sql
SELECT customers.id, customers.name
FROM customers
WHERE NOT EXISTS (
  SELECT 1 FROM orders WHERE orders.customer_id = customers.id
);
```

> **Why:** `NOT EXISTS` says what you mean, "no matching row exists", and a NULL cannot poison it. MySQL 8 also turns it into an antijoin.

> **Not this:** `NOT IN (SELECT ...)`. It breaks on NULL, and the Postgres planner cannot turn it into an anti-join.

```narrate
There is no anti join keyword, so people write it three ways. Not exists asks: is there no matching row. Left join with an is null test keeps the rows where the match came back empty. Not in compares against a list. The first two are safe. The third has a trap, and the plan is worse too. Prefer not exists. It says what you mean.
```

## The NOT IN trap

`5 NOT IN (1, NULL)` really means `5 <> 1 AND 5 <> NULL`.

- `5 <> 1` is true
- `5 <> NULL` is unknown
- true AND unknown is unknown, and `WHERE` drops unknown

For a value that equals 1 the answer is false. So with a NULL in the list, `NOT IN` is **never true**.

```svg One NULL in the list makes the whole NOT IN unknown, so the row is dropped
<svg viewBox="0 0 520 140" role="img" aria-label="Walking 5 NOT IN (1, NULL) step by step">
  <g font-family="var(--font-mono)" font-size="13">
    <text x="10" y="20" fill="var(--fg)">5 NOT IN (1, NULL)</text>
    <g data-cue="first">
      <rect x="10" y="40" width="150" height="60" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="64" fill="var(--fg)">5 &lt;&gt; 1</text>
      <text x="22" y="86" fill="var(--ok)">true</text>
    </g>
    <g data-cue="second">
      <path d="M160 70 L185 70" stroke="var(--fg-muted)" stroke-width="2"/>
      <rect x="185" y="40" width="150" height="60" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="197" y="64" fill="var(--fg)">5 &lt;&gt; NULL</text>
      <text x="197" y="86" fill="var(--danger)">unknown</text>
    </g>
    <g data-cue="result">
      <path d="M335 70 L360 70" stroke="var(--fg-muted)" stroke-width="2"/>
      <rect x="360" y="40" width="150" height="60" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="372" y="64" fill="var(--fg)">true AND unknown</text>
      <text x="372" y="86" fill="var(--danger)">row dropped</text>
    </g>
  </g>
</svg>
```

```narrate
Not in expands into a chain of not equal tests joined by and. [[first]] Five not equal one is true. [[second]] But five not equal null is unknown. [[result]] True and unknown is unknown, and where drops unknown rows. A value equal to one gives false instead. So with a null in the list, not in can never be true, and zero rows come back.
```

> **Trap:** one guest order with a NULL `customer_id` empties the result. No error. It works on your test data and breaks the day the first NULL arrives. MySQL follows the same SQL rule.

Fix it with `WHERE customer_id IS NOT NULL` inside the subquery, or switch to `NOT EXISTS`.

```quiz
q: orders.customer_id contains one NULL. What does WHERE id NOT IN (SELECT customer_id FROM orders) return?
options:
  - the customers with no orders
  - zero rows
  - an error
answer: 1
why: The NULL makes every NOT IN test false or unknown, never true. Postgres returns nothing and raises no error.
```

## Where does the filter go?

You want customers with no **paid** order. Ben has only a cancelled order, so he stays.

- `NOT EXISTS`: put `status = 'paid'` inside the subquery
- `LEFT JOIN`: put it in `ON`, never in `WHERE`

```sql
SELECT customers.id, customers.name
FROM customers
LEFT JOIN orders
  ON orders.customer_id = customers.id
  AND orders.status = 'paid'
WHERE orders.id IS NULL;
```

> **Trap:** `WHERE orders.id IS NULL AND orders.status = 'paid'` can never be true. On an unmatched row, `status` is NULL too. You get zero rows.

```narrate
You want customers without a paid order. Ben has only a cancelled order, so he stays. With not exists, put the paid test inside the subquery. With a left join, put it in the on clause, because on decides what counts as a match. Then where picks the rows with no match. If the paid test sits in where, it runs on the empty side, where status is null, and nothing survives.
```

```quiz
q: In the LEFT JOIN version of "customers with no paid order", where does status = 'paid' go?
options:
  - in the ON clause
  - in the WHERE clause
  - in the SELECT list
answer: 0
why: ON decides what counts as a match. WHERE then keeps the unmatched rows. A paid test in WHERE runs on NULL and removes everything.
```

## Your turn

Return the customers with **no paid order**. A customer with only cancelled or pending orders counts. Some orders are guest orders, so `orders.customer_id` can be `NULL`.

The starter uses `NOT IN` and returns nothing. Fix `query.sql`.

- Columns, in this order: `id`, `name`
- Sort: `id`
- The tests run two datasets, so no hardcoding

```hint
Run the subquery by itself. Besides customer ids, what else does it return?
```

```hint
NOT IN with a NULL in the list is never true. Switch to NOT EXISTS.
```

```hint
Inside NOT EXISTS, match orders.customer_id to customers.id, and add the paid test there.
```
