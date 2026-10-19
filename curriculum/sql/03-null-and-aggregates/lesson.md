---
title: NULL and aggregates
lang: sql
minutes: 20
level: junior
roles: [backend, analyst]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/functions-comparison.html
  - https://www.postgresql.org/docs/current/functions-aggregate.html
  - https://www.postgresql.org/docs/current/sql-select.html
  - https://www.postgresql.org/docs/current/queries-order.html
  - https://dev.mysql.com/doc/refman/8.4/en/working-with-null.html
---

## NULL means unknown

`NULL` is not zero and not empty text. It means **unknown**. Comparing anything with an unknown gives unknown.

| Expression | Result |
|---|---|
| `NULL = NULL` | NULL |
| `5 <> NULL` | NULL |
| `NULL IS NULL` | true |
| `5 IS DISTINCT FROM NULL` | true |

`WHERE` keeps a row only when the condition is **true**. False and unknown are both dropped.

```narrate
Null means unknown, not zero. [[gate]] Where is a gate that lets a row through only when the condition is true. [[pass]] True passes. [[false]] False is stopped. [[null]] And unknown is stopped too. So comparing a null with anything gives unknown, and the row quietly disappears. That is how a not equal filter loses every ticket where the column is null.
```

```svg WHERE lets only true through. A NULL comparison is unknown, so the row is dropped without any error
<svg viewBox="0 0 520 170" role="img" aria-label="Rows filtered by a WHERE gate">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="gate">
      <path d="M330 10 L330 160" stroke="var(--accent-2)" stroke-width="3" stroke-dasharray="6 4"/>
      <text x="300" y="165" fill="var(--fg-muted)" font-size="12">WHERE</text>
    </g>
    <g data-cue="pass">
      <rect x="10" y="15" width="290" height="36" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="38" fill="var(--fg)">'tier2' &lt;&gt; 'legal'  true</text>
      <path d="M300 33 L400 33" stroke="var(--ok)" stroke-width="3"/>
      <rect x="400" y="15" width="100" height="36" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="415" y="38" fill="var(--ok)">kept</text>
    </g>
    <g data-cue="false">
      <rect x="10" y="62" width="290" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="85" fill="var(--fg)">'legal' &lt;&gt; 'legal'  false</text>
      <path d="M320 70 L340 90 M340 70 L320 90" stroke="var(--danger)" stroke-width="3"/>
    </g>
    <g data-cue="null">
      <rect x="10" y="109" width="290" height="36" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="20" y="132" fill="var(--fg)">NULL &lt;&gt; 'legal'  NULL</text>
      <path d="M320 117 L340 137 M340 117 L320 137" stroke="var(--danger)" stroke-width="3"/>
    </g>
  </g>
</svg>
```

> **Trap:** `WHERE escalated_to <> 'legal'` silently drops every ticket where `escalated_to` is NULL. Use `IS DISTINCT FROM 'legal'`, or `IS NULL OR <> 'legal'`.

> **Why:** NULL might be anything, so SQL cannot say it differs from 'legal'. Unknown is not a yes.

```quiz
q: A row has x = NULL. What does SELECT * FROM t WHERE x <> 5 do with it?
options:
  - returns it
  - drops it
  - raises an error
answer: 1
why: NULL <> 5 is unknown, and WHERE keeps only true. No error, the row is just gone.
```

## COUNT(*) vs COUNT(column)

Aggregates skip NULLs, except `COUNT(*)`, which counts rows.

| Over `10, NULL, 30` | Result |
|---|---|
| `COUNT(*)` | 3 |
| `COUNT(x)` | 2 |
| `SUM(x)` | 40 |
| `AVG(x)` | 20 |
| `AVG(COALESCE(x, 0))` | 13.33 |

`SUM` over **no rows** is `NULL`, not 0. Wrap it: `COALESCE(SUM(x), 0)`.

```narrate
Look at three values: ten, null, and thirty. [[values]] The middle one is unknown. [[counts]] Count star counts all three rows. Count of the column counts only the two real values. [[avg]] The average divides forty by two, not by three, so it is twenty. If a null really means zero, say so with coalesce, and the average drops to thirteen.
```

```svg COUNT(*) sees 3 rows, COUNT(x) sees 2 values, and AVG divides by 2
<svg viewBox="0 0 520 170" role="img" aria-label="Three values, one of them NULL, and what each aggregate does">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="values">
      <rect x="10" y="15" width="120" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="40" fill="var(--fg)">10</text>
      <rect x="150" y="15" width="120" height="40" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="162" y="40" fill="var(--danger)">NULL</text>
      <rect x="290" y="15" width="120" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="302" y="40" fill="var(--fg)">30</text>
    </g>
    <g data-cue="counts">
      <text x="10" y="92" fill="var(--fg)">COUNT(*)  = 3   all rows</text>
      <text x="10" y="116" fill="var(--fg)">COUNT(x)  = 2   non-NULL only</text>
    </g>
    <g data-cue="avg">
      <text x="10" y="148" fill="var(--accent-2)">AVG(x) = 40 / 2 = 20</text>
    </g>
  </g>
</svg>
```

> **Trap:** `AVG` quietly skips NULLs. Decide what NULL means: unknown (skip it) or zero (`COALESCE`). They give different answers, and the interviewer wants to hear you choose.

MySQL follows the same NULL rules. One visible difference: a plain ascending `ORDER BY x` puts NULLs **first** in MySQL and **last** in Postgres. Postgres lets you choose with `NULLS FIRST` or `NULLS LAST`.

```quiz
q: Over the values 10, NULL, 30, what does AVG(x) return?
options:
  - 13.33
  - 20
  - 40
answer: 1
why: AVG skips the NULL and divides 40 by 2 values. Only COALESCE(x, 0) would give 13.33.
```

## WHERE or HAVING?

Both filter. They run at different moments.

- `WHERE` filters single **rows**, before groups exist
- `HAVING` filters whole **groups**, after the aggregates are computed

```sql
SELECT agent, COUNT(*) AS tickets
FROM support_tickets
WHERE status = 'closed'
GROUP BY agent
HAVING COUNT(*) >= 2;
```

```narrate
Rows flow through the query in order. [[where]] Where runs first and removes single rows, like tickets that are still open. [[group]] Then group by builds one bucket per agent and computes the counts. [[having]] Only now can having look at a whole bucket and ask, does this agent have at least two tickets. The aggregate does not exist yet when where runs.
```

```svg WHERE removes rows before grouping, HAVING removes whole groups after
<svg viewBox="0 0 520 150" role="img" aria-label="Order of FROM, WHERE, GROUP BY, HAVING and SELECT">
  <g font-family="var(--font-mono)" font-size="12">
    <rect x="0" y="25" width="88" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="14" y="52" fill="var(--fg)">FROM</text>
    <g data-cue="where">
      <path d="M88 47 L108 47" stroke="var(--fg-muted)" stroke-width="2"/>
      <rect x="108" y="25" width="88" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="124" y="52" fill="var(--fg)">WHERE</text>
      <text x="108" y="95" fill="var(--fg-muted)">one row</text>
      <text x="108" y="111" fill="var(--fg-muted)">at a time</text>
    </g>
    <g data-cue="group">
      <path d="M196 47 L216 47" stroke="var(--fg-muted)" stroke-width="2"/>
      <rect x="216" y="25" width="88" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="224" y="52" fill="var(--fg)">GROUP BY</text>
      <text x="216" y="95" fill="var(--fg-muted)">builds the</text>
      <text x="216" y="111" fill="var(--fg-muted)">aggregates</text>
    </g>
    <g data-cue="having">
      <path d="M304 47 L324 47" stroke="var(--fg-muted)" stroke-width="2"/>
      <rect x="324" y="25" width="88" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="336" y="52" fill="var(--fg)">HAVING</text>
      <text x="324" y="95" fill="var(--fg-muted)">a whole</text>
      <text x="324" y="111" fill="var(--fg-muted)">group</text>
    </g>
    <path d="M412 47 L432 47" stroke="var(--fg-muted)" stroke-width="2"/>
    <rect x="432" y="25" width="88" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="446" y="52" fill="var(--fg)">SELECT</text>
  </g>
</svg>
```

> **Not this:** `WHERE COUNT(*) >= 2`. It fails with "aggregate functions are not allowed in WHERE", because the groups do not exist yet. Counts go in `HAVING`.

> **Why:** a row filter in `WHERE` also shrinks the data before grouping, so there is less work to do.

## Your turn

Write one query in `query.sql` over `support_tickets` (`agent`, `status`, `escalated_to`, `minutes_to_resolve`, `rating`).

Per agent, count **closed** tickets, but skip those escalated to `legal`. A ticket never escalated has `escalated_to` NULL and must stay.

- Only agents with at least 2 such tickets
- Columns, in this order: `agent`, `tickets`, `rated` (tickets with a rating), `avg_rating` (rounded to 1 decimal, NULL if nobody rated), `total_minutes` (0 if none recorded)
- Sort: `agent`
- The tests run two datasets, so no hardcoding

```hint
Rows go in WHERE, groups go in HAVING. Which of your conditions is about one ticket, and which is about a whole agent?
```

```hint
escalated_to <> 'legal' drops the NULL rows. Look at IS DISTINCT FROM.
```

```hint
COUNT(*) counts tickets, COUNT(rating) counts rated ones, ROUND(AVG(rating), 1) skips NULLs by itself, and COALESCE(SUM(minutes_to_resolve), 0) fixes the empty sum.
```
