---
title: Running totals and LAG
lang: sql
minutes: 25
level: junior
roles: [backend, analyst]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/tutorial-window.html
  - https://www.postgresql.org/docs/current/sql-expressions.html
  - https://www.postgresql.org/docs/current/functions-window.html
  - https://www.postgresql.org/docs/current/functions-math.html
  - https://dev.mysql.com/doc/refman/8.4/en/window-functions-frames.html
  - https://dev.mysql.com/doc/refman/8.4/en/arithmetic-functions.html
---

## A running total keeps every row

A **running total** adds up everything so far. Put an aggregate in `OVER (ORDER BY ...)`.

```sql
SELECT id, paid_on, amount,
       SUM(amount) OVER (ORDER BY paid_on, id) AS running_total
FROM payments
ORDER BY paid_on, id;
```

Every payment keeps its row. `GROUP BY` could not do this: it would collapse the rows.

```narrate
A running total adds up everything so far. [[rows]] Each payment keeps its own row. [[total]] Next to it we attach the sum of all payments up to and including this one. Fifty after one hundred gives one hundred fifty, and so on. Group by cannot do this, because it would collapse the rows into one.
```

```svg Each row gets the sum of itself and every row before it
<svg viewBox="0 0 520 150" role="img" aria-label="Payments on the left, running totals on the right">
  <g font-family="var(--font-mono)" font-size="14">
    <text x="10" y="14" fill="var(--fg-muted)" font-size="12">payment</text>
    <text x="320" y="14" fill="var(--fg-muted)" font-size="12">running total</text>
    <g data-cue="rows">
      <rect x="10" y="24" width="200" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="46" fill="var(--fg)">id 1   amount 100</text>
      <rect x="10" y="64" width="200" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="86" fill="var(--fg)">id 2   amount  50</text>
      <rect x="10" y="104" width="200" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="126" fill="var(--fg)">id 3   amount  25</text>
    </g>
    <g data-cue="total">
      <path d="M210 41 L320 41 M210 81 L320 81 M210 121 L320 121" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="320" y="24" width="150" height="34" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="332" y="46" fill="var(--fg)">100</text>
      <rect x="320" y="64" width="150" height="34" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="332" y="86" fill="var(--fg)">100 + 50 = 150</text>
      <rect x="320" y="104" width="150" height="34" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="332" y="126" fill="var(--fg)">150 + 25 = 175</text>
    </g>
  </g>
</svg>
```

> **Why:** a window function adds a column and keeps the rows. A `GROUP BY` replaces them.

```quiz
q: Payments 10, 20, 30 in id order. What does SUM(amount) OVER (ORDER BY id) show on the last row?
options:
  - 30
  - 60
  - 20
answer: 1
why: The window sums from the first row through the current one, so 10 + 20 + 30 = 60.
```

## The tie trap: RANGE vs ROWS

With `ORDER BY` and no frame, the default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. `RANGE` includes all **peers**: rows tied on the `ORDER BY` value.

So three payments on the same day all show the same total, as if they happened at once.

| id | paid_on | amount | default (RANGE) | ROWS |
|---|---|---|---|---|
| 1 | Jan 1 | 100 | 100 | 100 |
| 2 | Jan 2 | 50 | 165 | 150 |
| 3 | Jan 2 | 25 | 165 | 175 |
| 4 | Jan 2 | -10 | 165 | 165 |

```sql
SUM(amount) OVER (
  ORDER BY paid_on, id
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)
```

> **Not this:** `ORDER BY paid_on` with the default frame. It looks right until two rows share a date. Name the frame with `ROWS`, and add `id` so the order is unique.

```narrate
Here is the trap. Two payments on the same day are tied on the order by column. [[peers]] SQL calls tied rows peers. [[rangesame]] The default frame is range, and range includes all peers of the current row. So every payment on January second shows the same total, as if they happened at once. [[rowsstep]] Rows mode counts one physical row at a time, so the total steps up payment by payment. Add the id to the order by, and use rows.
```

```svg RANGE gives tied rows the same total. ROWS steps one row at a time
<svg viewBox="0 0 520 175" role="img" aria-label="Three tied rows under RANGE and under ROWS">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="peers">
      <rect x="10" y="45" width="240" height="116" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="10" y="18" fill="var(--fg)">RANGE (default)</text>
      <text x="10" y="36" fill="var(--accent-2)" font-size="11">same day = peers</text>
    </g>
    <g data-cue="rangesame">
      <rect x="22" y="56" width="216" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="32" y="75" fill="var(--fg)">50    total 165</text>
      <rect x="22" y="90" width="216" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="32" y="109" fill="var(--fg)">25    total 165</text>
      <rect x="22" y="124" width="216" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="32" y="143" fill="var(--fg)">-10   total 165</text>
    </g>
    <g data-cue="rowsstep">
      <text x="270" y="18" fill="var(--fg)">ROWS</text>
      <text x="270" y="36" fill="var(--ok)" font-size="11">one row at a time</text>
      <rect x="270" y="56" width="216" height="28" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="280" y="75" fill="var(--fg)">50    total 150</text>
      <rect x="270" y="90" width="216" height="28" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="280" y="109" fill="var(--fg)">25    total 175</text>
      <rect x="270" y="124" width="216" height="28" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="280" y="143" fill="var(--fg)">-10   total 165</text>
    </g>
  </g>
</svg>
```

> **Trap:** MySQL 8 uses the same default frame, so the trap travels with you. Without `ORDER BY` the frame is the whole partition, so adding `ORDER BY` changes the answer.

```quiz
q: A payment of 100 comes first. Then three payments (50, 25, -10) share one date. With SUM(amount) OVER (ORDER BY paid_on) and no frame, what does the middle tied row (25) show?
options:
  - 175
  - 165
  - 150
answer: 1
why: Tied rows are peers, so each one's frame ends after the last tied row. That sum is 100 + 50 + 25 - 10 = 165.
```

## LAG and LEAD

`LAG(x)` returns `x` from the **previous row**. `LEAD(x)` returns it from the next row. With no row there, you get `NULL`, or a default: `LAG(x, 1, 0)`.

Month over month change:

```sql
SELECT month, revenue,
       revenue - LAG(revenue) OVER months AS change,
       ROUND(100.0 * (revenue - LAG(revenue) OVER months)
             / NULLIF(LAG(revenue) OVER months, 0), 1) AS change_percent
FROM monthly
WINDOW months AS (ORDER BY month);
```

> **Trap:** `LAG` looks at the previous **row**, not the previous month. If a month has no row, April is compared with February. Fill the gaps first.

```narrate
Lag looks one row back. [[first]] The first month has nothing before it, so lag gives null, and so does the change. [[lag]] For February, lag brings in January's revenue from the row above. [[change]] Subtract, and you have the month over month change. Lead does the same, looking forward. Wrap the divisor in nullif so a zero month does not divide by zero.
```

```svg LAG copies the previous row's value next to the current row, then you subtract
<svg viewBox="0 0 520 160" role="img" aria-label="Monthly revenue with previous value and change">
  <g font-family="var(--font-mono)" font-size="13">
    <text x="10" y="14" fill="var(--fg-muted)" font-size="12">month  revenue</text>
    <text x="190" y="14" fill="var(--accent-2)" font-size="12">LAG(revenue)</text>
    <text x="330" y="14" fill="var(--fg-muted)" font-size="12">change</text>
    <rect x="10" y="24" width="160" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="22" y="46" fill="var(--fg)">Jan   100</text>
    <rect x="10" y="64" width="160" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="22" y="86" fill="var(--fg)">Feb   130</text>
    <rect x="10" y="104" width="160" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="22" y="126" fill="var(--fg)">Mar   117</text>
    <g data-cue="first">
      <rect x="190" y="24" width="120" height="34" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="202" y="46" fill="var(--danger)">NULL</text>
      <rect x="330" y="24" width="120" height="34" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="342" y="46" fill="var(--danger)">NULL</text>
    </g>
    <g data-cue="lag">
      <path d="M90 58 L190 81 M90 98 L190 121" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="190" y="64" width="120" height="34" fill="var(--surface-2)" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="202" y="86" fill="var(--fg)">100</text>
      <rect x="190" y="104" width="120" height="34" fill="var(--surface-2)" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="202" y="126" fill="var(--fg)">130</text>
    </g>
    <g data-cue="change">
      <rect x="330" y="64" width="120" height="34" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="342" y="86" fill="var(--fg)">130 - 100 = +30</text>
      <rect x="330" y="104" width="120" height="34" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="342" y="126" fill="var(--fg)">117 - 130 = -13</text>
    </g>
  </g>
</svg>
```

> **Trap:** in Postgres, `100 * 30 / 100` with integers truncates. Use `100.0` to get decimals. MySQL's `/` already returns a decimal.

```quiz
q: A monthly table has January (100), February (130) and April (117). There is no March row. What does LAG(revenue) OVER (ORDER BY month) return for April?
options:
  - NULL
  - 130
  - 0
answer: 1
why: LAG takes the previous row, and that row is February. Generate the missing month first if you want a calendar comparison.
```

## Your turn

`payments` has `id`, `paid_on` (a date) and `amount`. Write one query in `query.sql` that returns **one row per payment**.

- Columns, in this order: `id`, `paid_on`, `amount`, `running_total`, `change`
- `running_total`: all payments up to and including this one, in order of `paid_on`, then `id`. Payments on the same day add one at a time
- `change`: this amount minus the previous payment's amount, in the same order. `NULL` for the first payment
- Sort: `paid_on`, then `id`
- The tests run two datasets, so no hardcoding

```hint
Both columns need the same ordering: paid_on, then id. A WINDOW clause lets you name it once and reuse it.
```

```hint
The starter shows the tie trap: its total jumps for same-day payments. Add id to the ORDER BY and an explicit ROWS frame.
```

```hint
change is amount - LAG(amount) OVER the same window. LAG gives NULL on the first row, and NULL minus anything is NULL.
```
