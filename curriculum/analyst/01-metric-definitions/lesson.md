---
title: Metric definitions
lang: sql
minutes: 20
level: junior
roles: [analyst]
files: [query.sql]
sources:
  - https://www.postgresql.org/docs/current/sql-expressions.html
  - https://www.postgresql.org/docs/current/functions-conditional.html
  - https://amplitude.com/docs/analytics/charts/funnel-analysis/funnel-analysis-interpret
  - https://corporatefinanceinstitute.com/resources/valuation/churn-rate
  - https://wallstreetprep.com/knowledge/arpu-average-revenue-per-user
  - https://www.appsflyer.com/glossary/app-stickiness/
---

## Same shop, two numbers

A metric is a **formula plus a denominator**. Change the denominator and the number changes, with no bug anywhere.

A shop had 1,000 visitors. 100 of them bought, and together they placed 130 orders.

| Name | Formula | Result |
|---|---|---|
| Conversion (buyers) | buyers / visitors | 10% |
| Conversion (orders) | orders / visitors | 13% |
| Orders per buyer | orders / buyers | 1.3 |

Both analysts are "right". The meeting is wrong if nobody says which one.

> **Why:** "How would you define X?" tests whether you fix the **unit** (person, order, session) and the **time window** before you compute anything.

```narrate
A metric is a formula plus a denominator. Take a shop with one thousand visitors, where one hundred people bought and placed one hundred thirty orders between them. Buyers over visitors is ten percent. Orders over visitors is thirteen percent. Neither is a bug, they are two different metrics. In an interview, name the unit and the time window before you compute anything.
```

## Active users: DAU, MAU, stickiness

- **Active** means one named action in the window. Say which: opened the app, played a video, bought?
- **DAU** (daily active users): distinct active people on one day
- **MAU** (monthly active users): distinct active people in 30 days
- **Stickiness** = DAU / MAU. Of my monthly users, what share show up on a typical day?

```sql
SELECT event_date, COUNT(DISTINCT user_id) AS dau
FROM events
WHERE event_name = 'play'
GROUP BY event_date;
```

```svg Three days, three people: daily counts are 2, 2, 1, but only 3 different people exist, so MAU is 3 and not 5
<svg viewBox="0 0 520 200" role="img" aria-label="Daily active users versus monthly active users">
  <g data-cue="days" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="26" fill="var(--fg-muted)">day 1</text>
    <rect x="20" y="36" width="34" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="37" y="57" text-anchor="middle" fill="var(--fg)">A</text>
    <rect x="58" y="36" width="34" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="75" y="57" text-anchor="middle" fill="var(--fg)">B</text>
    <text x="20" y="90" fill="var(--fg)">DAU 2</text>
    <text x="112" y="26" fill="var(--fg-muted)">day 2</text>
    <rect x="112" y="36" width="34" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="129" y="57" text-anchor="middle" fill="var(--fg)">A</text>
    <rect x="150" y="36" width="34" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="167" y="57" text-anchor="middle" fill="var(--fg)">C</text>
    <text x="112" y="90" fill="var(--fg)">DAU 2</text>
    <text x="204" y="26" fill="var(--fg-muted)">day 3</text>
    <rect x="204" y="36" width="34" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="221" y="57" text-anchor="middle" fill="var(--fg)">A</text>
    <text x="204" y="90" fill="var(--fg)">DAU 1</text>
  </g>
  <g data-cue="mau" font-family="var(--font-mono)" font-size="14">
    <path d="M262 52 L304 52" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    <rect x="310" y="30" width="190" height="46" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="322" y="50" fill="var(--fg)">MAU: A, B, C</text>
    <text x="322" y="68" fill="var(--fg)">= 3 people</text>
    <text x="310" y="104" fill="var(--danger)">not 2 + 2 + 1 = 5</text>
  </g>
  <g data-cue="ratio" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="150" fill="var(--fg)">average DAU = 5 / 3 = 1.67</text>
    <text x="20" y="176" fill="var(--fg)">stickiness = 1.67 / 3 = 56%</text>
  </g>
</svg>
```

```narrate
Look at three days. [[days]] On day one, A and B were active. On day two, A and C. On day three, only A. That gives daily counts of two, two and one. [[mau]] But only three different people showed up, so monthly active users is three, not five. [[ratio]] Average daily actives is one point six seven, divided by three, so stickiness is about fifty six percent.
```

> **Trap:** MAU is **not** the sum of the daily counts. A person who shows up 20 times is still one person.

```quiz
q: The same two people, A and B, are active on each of 3 days. What is the MAU?
options:
  - 6
  - 2
  - 3
answer: 1
why: MAU counts distinct people, and only A and B exist. Adding the daily counts would count each of them three times.
```

## Conversion: choose the denominator

Conversion rate = people who did the goal / people who had the chance, in one time window. The bottom is whoever **entered the funnel**. Amplitude defines it as users who finished, divided by users who triggered the first step.

```sql
SELECT v.channel,
       COUNT(DISTINCT v.visitor_id) AS visitor_count,
       COUNT(DISTINCT o.visitor_id) AS buyer_count
FROM visitors AS v
LEFT JOIN orders AS o ON o.visitor_id = v.visitor_id
GROUP BY v.channel;
```

```svg After the join, a repeat buyer is two rows. Counting rows says 4, counting people says 3 visitors and 2 buyers
<svg viewBox="0 0 520 230" role="img" aria-label="A join repeats a visitor who has two orders">
  <g data-cue="visitors" font-family="var(--font-mono)" font-size="13">
    <text x="20" y="24" fill="var(--fg-muted)">visitors</text>
    <rect x="20" y="34" width="100" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="52" fill="var(--fg)">v1 email</text>
    <rect x="20" y="64" width="100" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="82" fill="var(--fg)">v2 email</text>
    <rect x="20" y="94" width="100" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="112" fill="var(--fg)">v3 social</text>
  </g>
  <g data-cue="orders" font-family="var(--font-mono)" font-size="13">
    <text x="140" y="24" fill="var(--fg-muted)">orders</text>
    <rect x="140" y="34" width="80" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="150" y="52" fill="var(--fg)">o1 of v1</text>
    <rect x="140" y="64" width="80" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="150" y="82" fill="var(--fg)">o2 of v1</text>
    <rect x="140" y="94" width="80" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="150" y="112" fill="var(--fg)">o3 of v2</text>
  </g>
  <g data-cue="joined" font-family="var(--font-mono)" font-size="13">
    <text x="270" y="24" fill="var(--fg-muted)">after LEFT JOIN</text>
    <rect x="270" y="34" width="220" height="26" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="280" y="52" fill="var(--fg)">v1 email  o1</text>
    <rect x="270" y="64" width="220" height="26" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="280" y="82" fill="var(--fg)">v1 email  o2</text>
    <rect x="270" y="94" width="220" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="280" y="112" fill="var(--fg)">v2 email  o3</text>
    <rect x="270" y="124" width="220" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="280" y="142" fill="var(--fg)">v3 social -</text>
  </g>
  <g data-cue="counts" font-family="var(--font-mono)" font-size="13">
    <text x="20" y="188" fill="var(--danger)">COUNT(*) = 4 rows, for 3 visitors</text>
    <text x="20" y="212" fill="var(--ok)">COUNT(DISTINCT) = 3 visitors, 2 buyers</text>
  </g>
</svg>
```

```narrate
Picture the join. [[visitors]] On the left are three visitors. [[orders]] In the middle, visitor one placed two orders and visitor two placed one. [[joined]] After the join, visitor one appears twice, so there are four rows for only three people. [[counts]] Counting rows says four. Counting distinct visitors says three, and distinct buyers says two. Always count distinct people.
```

> **Trap:** `INNER JOIN` keeps only buyers, so every channel shows 100% and a channel with no buyers disappears. Start from visitors and use `LEFT JOIN`.

> **Not this:** `COUNT(*)` after a join. A repeat buyer is counted once per order, so the rate drifts above the truth.

> **Trap:** a bottom of 0 raises "division by zero". `x / NULLIF(y, 0)` returns NULL instead.

## ARPU and churn: who is at the bottom?

| Metric | Top | Bottom |
|---|---|---|
| ARPU | revenue in the period | **all** users in the period |
| ARPPU | revenue in the period | **paying** users only |
| Churn rate | customers lost in the period | customers at the **start** |

Example: 500 customers at the start of the month, 25 leave, 100 join. Churn is 25 / 500 = **5%**, not 25 / 575. The 100 newcomers were not in the starting group.

> **Why:** a fixed starting group answers one clean question: "of the people we had, how many did we keep?" Counting new signups in the bottom hides churn when growth is fast.

```narrate
Three definitions that interviewers love. A R P U, average revenue per user, divides by all users. Divide by paying users only and you get a different metric called A R P P U, usually much bigger. Churn divides the customers lost by the customers you had at the start of the period. Newcomers are not in that starting group, so they stay out of the bottom.
```

```quiz
q: 500 customers at the start of the month. 25 cancel. 100 new customers join. What is the monthly churn?
options:
  - 4.3% (25 / 575)
  - 5% (25 / 500)
  - 20% (100 / 500)
answer: 1
why: Churn uses the customers at the start of the period, 500, as the bottom. New customers do not belong there.
```

## Your turn

Open `query.sql`. Tables: `visitors(visitor_id, channel)` and `orders(order_id, visitor_id, amount)`. A visitor can place many orders.

Write one query, one row per channel:

- `channel`
- `visitor_count`: distinct visitors
- `buyer_count`: distinct visitors with at least one order
- `conversion_rate`: `buyer_count / visitor_count`, rounded to 3 decimals
- Sort by `channel`. A channel with no buyers still appears, with rate 0

The tests run it on two different datasets, so no hardcoding.

```hint
Start the query from visitors, not orders. Every visitor must stay in the result, buyer or not.
```

```hint
LEFT JOIN orders on visitor_id, then COUNT(DISTINCT ...) on each side. COUNT ignores the NULLs that non-buyers produce.
```

```hint
Dividing two integers in Postgres gives an integer, so 1 / 6 is 0. Cast one side with ::numeric before you divide, then ROUND(..., 3).
```
