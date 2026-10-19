---
title: Cohort retention table
lang: py
minutes: 25
level: junior
roles: [analyst]
files: [retention.py]
sources:
  - https://pandas.pydata.org/docs/reference/api/pandas.pivot_table.html
  - https://pandas.pydata.org/docs/reference/api/pandas.Series.dt.to_period.html
  - https://pandas.pydata.org/docs/user_guide/groupby.html
  - https://pandas.pydata.org/docs/user_guide/missing_data.html
  - https://amplitude.com/docs/analytics/charts/funnel-analysis/funnel-analysis-interpret
---

## What a cohort table shows

A **cohort** is the group of users who first showed up in the same month. **Retention** at month `k` is the share of that cohort still active `k` months later.

One blended retention number mixes old and new users. A cohort table lines every group up at month 0, so you can see whether last month's signups behave better or worse than January's.

```svg Rows are cohorts, columns are months since signup, dashed cells are months that have not happened yet
<svg viewBox="0 0 520 240" role="img" aria-label="Cohort retention triangle">
  <g data-cue="cohorts" font-family="var(--font-mono)" font-size="13">
    <text x="20" y="62" fill="var(--fg)">2024-01</text>
    <text x="20" y="100" fill="var(--fg)">2024-02</text>
    <text x="20" y="138" fill="var(--fg)">2024-03</text>
    <text x="20" y="176" fill="var(--fg)">2024-04</text>
    <text x="110" y="30" fill="var(--fg-muted)">month 0</text>
    <text x="190" y="30" fill="var(--fg-muted)">month 1</text>
    <text x="270" y="30" fill="var(--fg-muted)">month 2</text>
    <text x="350" y="30" fill="var(--fg-muted)">month 3</text>
  </g>
  <g data-cue="cells" font-family="var(--font-mono)" font-size="13">
    <rect x="110" y="44" width="74" height="34" fill="var(--primary)" fill-opacity="0.9" stroke="var(--border)" stroke-width="2"/>
    <text x="147" y="66" text-anchor="middle" fill="var(--fg)">100%</text>
    <rect x="190" y="44" width="74" height="34" fill="var(--primary)" fill-opacity="0.5" stroke="var(--border)" stroke-width="2"/>
    <text x="227" y="66" text-anchor="middle" fill="var(--fg)">50%</text>
    <rect x="270" y="44" width="74" height="34" fill="var(--primary)" fill-opacity="0.5" stroke="var(--border)" stroke-width="2"/>
    <text x="307" y="66" text-anchor="middle" fill="var(--fg)">50%</text>
    <rect x="350" y="44" width="74" height="34" fill="var(--primary)" fill-opacity="0.25" stroke="var(--border)" stroke-width="2"/>
    <text x="387" y="66" text-anchor="middle" fill="var(--fg)">25%</text>
    <rect x="110" y="82" width="74" height="34" fill="var(--primary)" fill-opacity="0.9" stroke="var(--border)" stroke-width="2"/>
    <text x="147" y="104" text-anchor="middle" fill="var(--fg)">100%</text>
    <rect x="190" y="82" width="74" height="34" fill="var(--primary)" fill-opacity="0.33" stroke="var(--border)" stroke-width="2"/>
    <text x="227" y="104" text-anchor="middle" fill="var(--fg)">33%</text>
    <rect x="270" y="82" width="74" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="307" y="104" text-anchor="middle" fill="var(--fg)">0%</text>
    <rect x="110" y="120" width="74" height="34" fill="var(--primary)" fill-opacity="0.9" stroke="var(--border)" stroke-width="2"/>
    <text x="147" y="142" text-anchor="middle" fill="var(--fg)">100%</text>
    <rect x="190" y="120" width="74" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="227" y="142" text-anchor="middle" fill="var(--fg)">0%</text>
    <rect x="110" y="158" width="74" height="34" fill="var(--primary)" fill-opacity="0.9" stroke="var(--border)" stroke-width="2"/>
    <text x="147" y="180" text-anchor="middle" fill="var(--fg)">100%</text>
  </g>
  <g data-cue="future" font-family="var(--font-mono)" font-size="13">
    <rect x="350" y="82" width="74" height="34" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
    <rect x="270" y="120" width="74" height="34" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
    <rect x="350" y="120" width="74" height="34" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
    <rect x="190" y="158" width="74" height="34" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
    <rect x="270" y="158" width="74" height="34" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
    <rect x="350" y="158" width="74" height="34" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="20" y="224" fill="var(--danger)">dashed = not happened yet (blank, not 0%)</text>
  </g>
</svg>
```

```narrate
Read it like a map. [[cohorts]] Each row is a cohort, the people who first appeared in one month, and each column is how many months later we look. [[cells]] A cell is the share of that cohort still active. Month zero is always one hundred percent. A zero percent cell is real: everyone from that group went quiet. [[future]] The dashed cells are months that have not happened yet. They stay blank, which is why the table is a triangle.
```

> **Why:** every row starts at month 0, so cohorts compare like with like, even when they started months apart.

> **Not this:** one overall retention number. A great old cohort can hide a weak new one.

## Build it in four moves

```python
event_month = events["event_date"].dt.to_period("M")
cohort_month = event_month.groupby(events["user_id"]).transform("min")
months_since_signup = (event_month - cohort_month).map(lambda offset: offset.n)
```

Then `pivot_table` counts **distinct** users for each (cohort, month) cell, and each row is divided by its month 0 count.

```svg Following user 4: events in January, March and April land in months 0, 2 and 3 of the January row, and month 1 stays empty
<svg viewBox="0 0 520 240" role="img" aria-label="One user traced through the cohort table">
  <g data-cue="events" font-family="var(--font-mono)" font-size="13">
    <text x="20" y="56" fill="var(--fg-muted)">events</text>
    <rect x="150" y="36" width="90" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="195" y="55" text-anchor="middle" fill="var(--fg)">Jan 8</text>
    <rect x="260" y="36" width="90" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="305" y="55" text-anchor="middle" fill="var(--fg)">Mar 15</text>
    <rect x="370" y="36" width="90" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="415" y="55" text-anchor="middle" fill="var(--fg)">Apr 2</text>
  </g>
  <g data-cue="months" font-family="var(--font-mono)" font-size="13">
    <text x="20" y="92" fill="var(--fg-muted)">month</text>
    <text x="195" y="92" text-anchor="middle" fill="var(--fg)">2024-01</text>
    <text x="305" y="92" text-anchor="middle" fill="var(--fg)">2024-03</text>
    <text x="415" y="92" text-anchor="middle" fill="var(--fg)">2024-04</text>
  </g>
  <g data-cue="cohort" font-family="var(--font-mono)" font-size="13">
    <text x="20" y="124" fill="var(--fg-muted)">cohort</text>
    <rect x="150" y="106" width="270" height="26" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="160" y="124" fill="var(--fg)">earliest month: 2024-01</text>
  </g>
  <g data-cue="periods" font-family="var(--font-mono)" font-size="13">
    <text x="20" y="156" fill="var(--fg-muted)">period</text>
    <text x="195" y="156" text-anchor="middle" fill="var(--fg)">0</text>
    <text x="305" y="156" text-anchor="middle" fill="var(--fg)">2</text>
    <text x="415" y="156" text-anchor="middle" fill="var(--fg)">3</text>
  </g>
  <g data-cue="cells" font-family="var(--font-mono)" font-size="13">
    <text x="20" y="196" fill="var(--fg-muted)">Jan row</text>
    <rect x="150" y="176" width="44" height="26" fill="var(--primary)" fill-opacity="0.7" stroke="var(--border)" stroke-width="2"/>
    <text x="172" y="194" text-anchor="middle" fill="var(--fg)">0</text>
    <rect x="200" y="176" width="44" height="26" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="222" y="194" text-anchor="middle" fill="var(--fg)">1</text>
    <rect x="250" y="176" width="44" height="26" fill="var(--primary)" fill-opacity="0.7" stroke="var(--border)" stroke-width="2"/>
    <text x="272" y="194" text-anchor="middle" fill="var(--fg)">2</text>
    <rect x="300" y="176" width="44" height="26" fill="var(--primary)" fill-opacity="0.7" stroke="var(--border)" stroke-width="2"/>
    <text x="322" y="194" text-anchor="middle" fill="var(--fg)">3</text>
    <text x="150" y="224" fill="var(--fg-muted)">month 1 stays empty for this user</text>
  </g>
</svg>
```

```narrate
Follow one user. [[events]] User four was active on January eighth, March fifteenth and April second. [[months]] Cut each date down to its month. [[cohort]] The earliest month is the cohort, here January. [[periods]] Subtract it from each month and you get zero, two and three months since signup. [[cells]] So this user lights up month zero, two and three of the January row. Month one stays empty, because they skipped February.
```

## Three traps

- **Count users, not events.** User 2 has two January events but is one person. Use `aggfunc="nunique"`
- **Future is not zero.** After the pivot, unseen cells look like `0`. Turn them into `NaN`: a cell is in the future when `cohort + k` is after the last month in the data
- **Months cross years.** November to January is 2 months. Subtracting `.month` numbers gives -10. Subtract `Period`s

> **Trap:** divide each row by its own month 0 count, the cohort size. Not by the previous month's active users: that measures step-to-step survival, a different metric.

```narrate
Three traps catch most people. First, count distinct users, not events, because one person can be active ten times in a month. Second, a cell for a month that has not happened yet looks like zero after the pivot, but zero claims that everyone left. It should be blank. Third, do month math with periods, so that November to January is two months, not minus ten. And always divide by the cohort size from month zero.
```

```quiz
q: The February cohort has 3 users. One of them is active in March. What is the retention at month 1?
options:
  - 100%
  - 33%
  - 25%
answer: 1
why: Month 1 for a February cohort is March. One active user out of the cohort size of 3 is 33%.
```

## Your turn

Open `retention.py` and implement `retention_matrix(events)`.

- `events` has `user_id` and `event_date` (datetime), in any order
- Return a DataFrame: index is the cohort month as text like `"2024-01"` (sorted), columns are the integers `0, 1, 2, ...`
- Each cell is the share of the cohort active in that month, from 0 to 1
- A cell for a month after the last month in the data is `NaN`
- Do not change the frame you were given

```hint
Month of each event: dt.to_period("M"). A user's cohort is the smallest month among their events: groupby("user_id") with transform("min").
```

```hint
Subtracting two Periods gives an offset, and offset.n is the number of months. Then pivot_table with index the cohort, columns the months, values user_id, aggfunc nunique, fill_value 0. Divide each row by its column 0 with .div(..., axis=0).
```

```hint
The future shows as 0 right now. Cell (cohort, k) is in the future when cohort.ordinal + k is greater than last_month.ordinal. Build that True/False table and use DataFrame.mask to turn those cells into NaN. Finish with the index as text: index.astype(str).
```
