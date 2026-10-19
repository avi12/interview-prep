---
title: Retention and funnels
lang: sql
minutes: 30
level: junior
roles: [analyst, backend]
files: [retention.sql, funnel.sql]
sources:
  - https://www.postgresql.org/docs/current/functions-datetime.html
  - https://www.postgresql.org/docs/current/functions-window.html
  - https://www.holistics.io/blog/calculate-cohort-retention-analysis-with-sql/
---

## Two questions every product analyst gets

- **Retention:** of the people who signed up in a given week, how many came back later?
- **Funnel:** of the people who started, how many reached each next step?

Both count **people**, not events. A user who clicks ten times is still one user. Count events and every percentage is wrong.

> **Why:** interviewers use these to test three habits at once: choosing the right grain, counting distinct people, and defining the denominator out loud.

```narrate
Two questions come up in almost every analyst interview. Retention asks how many people came back. A funnel asks how many people reached each step. Both count people, not clicks, and that one rule is where most wrong answers come from.
```

## DATE_TRUNC makes the cohort

A **cohort** is a group of users who started in the same period. `DATE_TRUNC('week', day)` snaps any date back to the **Monday** of its week, so every signup in that week gets the same label.

```sql
SELECT DATE_TRUNC('week', DATE '2025-01-09')::date AS cohort_week;
```

That returns `2025-01-06`. The cast `::date` is needed because `DATE_TRUNC` hands back a timestamp.

```svg Every signup date in a week snaps to that week's Monday, so one week becomes one cohort label
<svg viewBox="0 0 520 210" role="img" aria-label="Signup dates snapping to the Monday of their week">
  <g font-family="var(--font-mono)" font-size="13" text-anchor="middle">
    <g data-cue="weekA">
      <text x="125" y="22" fill="var(--fg-muted)">week of Jan 6</text>
      <rect x="20" y="32" width="30" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="35" y="52" fill="var(--fg)">6</text>
      <rect x="50" y="32" width="30" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="65" y="52" fill="var(--fg)">7</text>
      <rect x="80" y="32" width="30" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="95" y="52" fill="var(--fg)">8</text>
      <rect x="110" y="32" width="30" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="125" y="52" fill="var(--fg)">9</text>
      <rect x="140" y="32" width="30" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="155" y="52" fill="var(--fg)">10</text>
      <rect x="170" y="32" width="30" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="185" y="52" fill="var(--fg)">11</text>
      <rect x="200" y="32" width="30" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="215" y="52" fill="var(--fg)">12</text>
      <path d="M65 64 L65 110 M125 64 L125 110 M215 64 L215 110" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <rect x="40" y="110" width="170" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="125" y="132" fill="var(--fg)">cohort Jan 6</text>
    </g>
    <g data-cue="weekB">
      <text x="385" y="22" fill="var(--fg-muted)">week of Jan 13</text>
      <rect x="280" y="32" width="30" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="295" y="52" fill="var(--fg)">13</text>
      <rect x="310" y="32" width="30" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="325" y="52" fill="var(--fg)">14</text>
      <rect x="340" y="32" width="30" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="355" y="52" fill="var(--fg)">15</text>
      <rect x="370" y="32" width="30" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="52" fill="var(--fg)">16</text>
      <rect x="400" y="32" width="30" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="415" y="52" fill="var(--fg)">17</text>
      <rect x="430" y="32" width="30" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="445" y="52" fill="var(--fg)">18</text>
      <rect x="460" y="32" width="30" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="475" y="52" fill="var(--fg)">19</text>
      <path d="M295 64 L295 110 M385 64 L385 110" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <rect x="270" y="110" width="170" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="355" y="132" fill="var(--fg)">cohort Jan 13</text>
    </g>
    <g data-cue="rule">
      <text x="20" y="190" text-anchor="start" fill="var(--fg)">highlighted = a signup day. Same week, same label.</text>
    </g>
  </g>
</svg>
```

```narrate
Look at the picture. [[weekA]] These seven days are one week. Three people signed up on the seventh, the ninth and the twelfth, and all three land in the cohort labelled January sixth. [[weekB]] The next week is a new cohort, with its own label. [[rule]] Same week, same label. That label is what we group by.
```

## Retention: join back and count distinct

1. Give every user a `cohort_week`.
2. `LEFT JOIN` their later events.
3. Count **distinct** users per cohort.
4. Divide by the cohort size.

This version asks "came back at all after the signup week":

```sql
WITH cohorts AS (
  SELECT id AS user_id, DATE_TRUNC('week', signed_up_at)::date AS cohort_week
  FROM users
)
SELECT cohorts.cohort_week,
       COUNT(DISTINCT cohorts.user_id) AS users,
       COUNT(DISTINCT events.user_id) AS came_back
FROM cohorts
LEFT JOIN events
  ON events.user_id = cohorts.user_id
 AND events.event_date >= cohorts.cohort_week + 7
GROUP BY cohorts.cohort_week
ORDER BY cohorts.cohort_week;
```

```svg Retention in three moves: label each user, join their later events, count people not events
<svg viewBox="0 0 520 220" role="img" aria-label="Cohort, join, count">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="cohort">
      <rect x="20" y="20" width="140" height="120" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="42" fill="var(--fg-muted)">1. cohort Jan 6</text>
      <text x="30" y="68" fill="var(--fg)">u1</text>
      <text x="30" y="88" fill="var(--fg)">u2</text>
      <text x="30" y="108" fill="var(--fg)">u3</text>
      <text x="30" y="128" fill="var(--fg)">u4</text>
    </g>
    <g data-cue="join">
      <path d="M160 80 L190 80" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="190" y="20" width="150" height="120" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="200" y="42" fill="var(--fg-muted)">2. later events</text>
      <text x="200" y="68" fill="var(--fg)">u1  u1  (2 rows)</text>
      <text x="200" y="88" fill="var(--fg-muted)">u2  none</text>
      <text x="200" y="108" fill="var(--fg-muted)">u3  none</text>
      <text x="200" y="128" fill="var(--fg)">u4  (1 row)</text>
    </g>
    <g data-cue="count">
      <path d="M340 80 L370 80" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="370" y="20" width="130" height="120" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="380" y="42" fill="var(--fg)">3. distinct</text>
      <text x="380" y="72" fill="var(--fg)">u1, u4 = 2</text>
      <text x="380" y="98" fill="var(--fg)">2 / 4 people</text>
      <text x="380" y="124" fill="var(--fg)">= 50.0 %</text>
    </g>
    <text x="20" y="190" fill="var(--fg)">u1 has 2 events but counts once.</text>
  </g>
</svg>
```

```narrate
Three moves. [[cohort]] First, label every user with a cohort week. Here four people signed up in the same week. [[join]] Second, join their later events. User one has two rows, user four has one, and two users have none. [[count]] Third, count distinct people. That is two out of four, so fifty percent. User one counts once, not twice.
```

> **Not this:** `COUNT(*)` over the joined rows. User `u1` would count twice and retention could pass 100 %.

## Keep the cohorts nobody came back to

Put the "later events" test in the `ON` clause, **not** in `WHERE`.

After a `LEFT JOIN`, a cohort with no returning users has `NULL` in the event columns. A `WHERE events.event_date ...` test throws those rows away, and the **worst** cohort silently vanishes from your report.

> **Trap:** a filter on the right table in `WHERE` turns a `LEFT JOIN` into an inner join. Filters on the right table go in `ON`.

```narrate
A classic bug. If you put the date test in the where clause, cohorts with zero returning users are removed, and your worst week disappears from the chart. Keep the test in the on clause of the left join, and the empty cohort stays with a zero.
```

```quiz
q: A cohort of 5 users has a single returning user, who has 3 events. Which count gives the right retained number?
options:
  - COUNT(*) = 3
  - COUNT(events.user_id) = 3
  - COUNT(DISTINCT events.user_id) = 1
answer: 2
why: Retention counts people. One person with three events is one retained user, and distinct is how you say that.
```

## Funnels: distinct people per step

A funnel lists ordered steps. For each step, count the **distinct people** who reached it, then compare with the step before.

Start from a small steps table, so a step that nobody reached still shows up with 0. Then use `LAG` to look at the previous row.

```sql
SELECT step, users,
       ROUND(100.0 * users / LAG(users) OVER (ORDER BY position), 1) AS pct_of_previous
FROM step_counts
ORDER BY position;
```

```svg A funnel narrows at each step; the percent is people at this step divided by people at the step above
<svg viewBox="0 0 520 220" role="img" aria-label="Funnel bars with step conversion">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="top">
      <rect x="20" y="20" width="300" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="40" fill="var(--fg)">visit  10</text>
    </g>
    <g data-cue="steps">
      <rect x="20" y="60" width="180" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="80" fill="var(--fg)">signup  6</text>
      <rect x="20" y="100" width="90" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="120" fill="var(--fg)">cart  3</text>
      <rect x="20" y="140" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="60" y="160" fill="var(--fg)">buy  1</text>
    </g>
    <g data-cue="ratio">
      <text x="340" y="80" fill="var(--accent-2)">60.0 % of visit</text>
      <text x="340" y="120" fill="var(--accent-2)">50.0 % of signup</text>
      <text x="340" y="160" fill="var(--accent-2)">33.3 % of cart</text>
    </g>
  </g>
</svg>
```

```narrate
Read it top down. [[top]] Ten people visited. [[steps]] Six signed up, three added to cart, and one bought. [[ratio]] Each percent compares a step with the step right above it. Sixty percent of visitors signed up, half of the signups added to cart, and a third of cart users bought.
```

> **Why:** step-to-step percent shows **where** people drop. Percent of the first step shows the **overall** yield. Ask which one the stakeholder wants.

> **Trap:** the previous step can be 0, and dividing by 0 raises an error. Wrap the divisor in `NULLIF(..., 0)`.

```quiz
q: Why start the funnel query from a steps table instead of grouping the events table directly?
options:
  - It runs faster
  - A step nobody reached would otherwise be missing from the result
  - GROUP BY needs a second table
answer: 1
why: Grouping events only returns steps that have events. The steps table is the spine that keeps empty steps at 0.
```

## Your turn

Two queries, two files, same data model. Both run on two different datasets.

**`retention.sql`** reads `users(id, signed_up_at)` and `events(user_id, event_date)`. For each signup week return **week 1 retention**: users with at least one event in the **calendar week right after** their signup week.

- Columns: `cohort_week` (a date), `users`, `retained_week_1`, `retention_pct` (rounded to 1 decimal)
- A cohort nobody came back to still appears, with 0
- Sort by `cohort_week`

**`funnel.sql`** reads `funnel_steps(position, name)` and `funnel_events(user_id, step, occurred_at)`.

- Columns: `step`, `users` (distinct people), `pct_of_previous` (1 decimal, `NULL` for the first step)
- One row per step in `position` order, even a step with 0 users

```hint
Retention: build the cohort with DATE_TRUNC('week', signed_up_at)::date. A date plus 7 is the same weekday one week later.
```

```hint
Retention: LEFT JOIN events ON the same user AND DATE_TRUNC('week', event_date)::date = cohort_week + 7. Then COUNT(DISTINCT ...) on both sides.
```

```hint
Funnel: LEFT JOIN funnel_events onto funnel_steps by name, GROUP BY the step, COUNT(DISTINCT user_id). Then use LAG in a second query over that result.
```
