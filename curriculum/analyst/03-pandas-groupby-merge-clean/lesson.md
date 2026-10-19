---
title: Pandas - groupby, merge, clean
lang: py
minutes: 25
level: junior
roles: [analyst]
files: [order_summary.py]
sources:
  - https://pandas.pydata.org/docs/user_guide/groupby.html
  - https://pandas.pydata.org/docs/user_guide/merging.html
  - https://pandas.pydata.org/docs/user_guide/missing_data.html
  - https://pandas.pydata.org/docs/reference/api/pandas.to_numeric.html
  - https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.drop_duplicates.html
---

## groupby: split, apply, combine

`groupby` splits the rows by a key, runs an aggregation on each group, and combines the results into one row per group.

```python
orders.groupby("segment", as_index=False).agg(
    order_count=("order_id", "count"),
    revenue=("amount", "sum"),
)
```

Each keyword is an output column: `name=("source column", "function")`.

```svg Rows are split by segment, each group is summed, and every group becomes one row
<svg viewBox="0 0 520 165" role="img" aria-label="Rows split into groups and aggregated">
  <g data-cue="rows" font-family="var(--font-mono)" font-size="13">
    <text x="20" y="24" fill="var(--fg-muted)">orders</text>
    <rect x="20" y="34" width="120" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="52" fill="var(--fg)">retail   10</text>
    <rect x="20" y="64" width="120" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="82" fill="var(--fg)">smb      40</text>
    <rect x="20" y="94" width="120" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="112" fill="var(--fg)">retail   20</text>
    <rect x="20" y="124" width="120" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="142" fill="var(--fg)">smb       5</text>
  </g>
  <g data-cue="groups" font-family="var(--font-mono)" font-size="13">
    <path d="M146 60 L186 48" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    <path d="M146 100 L186 56" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    <path d="M146 72 L186 112" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    <path d="M146 134 L186 118" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    <text x="192" y="24" fill="var(--fg-muted)">groups</text>
    <rect x="192" y="34" width="120" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="202" y="58" fill="var(--fg)">retail: 10, 20</text>
    <rect x="192" y="94" width="120" height="40" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="202" y="118" fill="var(--fg)">smb: 40, 5</text>
  </g>
  <g data-cue="result" font-family="var(--font-mono)" font-size="13">
    <path d="M316 54 L346 54" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    <path d="M316 114 L346 114" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    <text x="352" y="24" fill="var(--fg-muted)">count  revenue</text>
    <rect x="352" y="34" width="150" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="362" y="58" fill="var(--fg)">retail  2   30</text>
    <rect x="352" y="94" width="150" height="40" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="362" y="118" fill="var(--fg)">smb     2   45</text>
  </g>
</svg>
```

```narrate
Start on the left. [[rows]] Four order rows, two for retail and two for small business. [[groups]] Group by splits them into one pile per segment, so retail holds ten and twenty, and small business holds forty and five. [[result]] Then each pile is reduced to a single row: the count and the sum. Four rows became two.
```

> **Why:** named aggregation gives readable column names in one call, with no multi-level columns to flatten afterwards.

> **Not this:** looping over `segment.unique()` and filtering each time. It rescans the frame once per key and says less.

> **Trap:** rows whose key is missing disappear by default (`dropna=True`). Fill the key first, or pass `dropna=False`.

## merge: pick the join, check the keys

| `how` | Keeps | SQL |
|---|---|---|
| `inner` | keys on both sides | `INNER JOIN` |
| `left` | every left row | `LEFT JOIN` |
| `outer` | every row from both | `FULL OUTER JOIN` |

Missing partners become `NaN`. The dangerous case: a key that appears more than once on **both** sides. pandas builds every pairing, so 2 x 3 duplicates give 6 rows.

```python
orders.merge(customers, on="customer_id", how="left", validate="many_to_one")
```

```svg Customer 7 is listed twice, so each of her two orders is repeated and revenue doubles from 30 to 60
<svg viewBox="0 0 520 240" role="img" aria-label="A duplicate key doubles the rows of a merge">
  <g data-cue="left" font-family="var(--font-mono)" font-size="13">
    <text x="20" y="24" fill="var(--fg-muted)">orders</text>
    <rect x="20" y="34" width="130" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="52" fill="var(--fg)">o1 cust 7  10</text>
    <rect x="20" y="64" width="130" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="82" fill="var(--fg)">o2 cust 7  20</text>
  </g>
  <g data-cue="right" font-family="var(--font-mono)" font-size="13">
    <text x="170" y="24" fill="var(--fg-muted)">customers</text>
    <rect x="170" y="34" width="120" height="26" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
    <text x="180" y="52" fill="var(--fg)">7 retail</text>
    <rect x="170" y="64" width="120" height="26" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
    <text x="180" y="82" fill="var(--fg)">7 smb</text>
  </g>
  <g data-cue="result" font-family="var(--font-mono)" font-size="13">
    <text x="330" y="24" fill="var(--fg-muted)">after merge: 4 rows</text>
    <rect x="330" y="34" width="170" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="340" y="52" fill="var(--fg)">o1 retail  10</text>
    <rect x="330" y="64" width="170" height="26" fill="var(--primary-container)" stroke="var(--danger)" stroke-width="2"/>
    <text x="340" y="82" fill="var(--fg)">o1 smb     10</text>
    <rect x="330" y="94" width="170" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="340" y="112" fill="var(--fg)">o2 retail  20</text>
    <rect x="330" y="124" width="170" height="26" fill="var(--primary-container)" stroke="var(--danger)" stroke-width="2"/>
    <text x="340" y="142" fill="var(--fg)">o2 smb     20</text>
  </g>
  <g data-cue="total" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="200" fill="var(--ok)">true revenue: 10 + 20 = 30</text>
    <text x="20" y="224" fill="var(--danger)">revenue after the merge: 60</text>
  </g>
</svg>
```

```narrate
Watch how a quiet bug is born. [[left]] Two orders belong to customer seven, worth ten and twenty. [[right]] But the customer table lists customer seven twice, once as retail and once as small business. [[result]] The merge pairs every order with every matching customer row, so four rows come out. [[total]] The real revenue is thirty, yet the merged table says sixty. No error, just a wrong number.
```

> **Why:** `validate="many_to_one"` raises `MergeError` if the right keys are not unique. A silent wrong total becomes a loud error.

> **Not this:** merge and glance at the row count afterwards. Nobody looks, and the wrong total reaches the dashboard.

```quiz
q: A left table has 4 rows with key K. A right table has 3 rows with key K. How many rows does an inner merge on K return?
options:
  - 4
  - 7
  - 12
answer: 2
why: Duplicates on both sides pair up in every combination, 4 x 3 = 12.
```

## Missing values and dtypes

- `NaN` means "unknown", not zero. `sum` and `mean` skip it by default, so a mean covers only the known rows
- `NaN == NaN` is `False`, so find gaps with `isna()`, never `== NaN`
- Numbers from a messy file arrive as `object` text, like `"$12.50"`. Strip the symbols, then `pd.to_numeric(series, errors="coerce")`: bad text becomes `NaN` instead of crashing

| Goal | Tool |
|---|---|
| Count gaps | `df.isna().sum()` |
| Drop rows | `df.dropna(subset=["amount"])` |
| Fill | `df.fillna(...)` |

> **Trap:** `fillna(0)` on amounts says "this order was free". Every average drops. Pick a rule (drop, fill, flag) and say it out loud.

```narrate
Missing values are unknown, not zero. Sums and means skip them, so a mean only covers the rows where the value is known. Number columns from messy files often arrive as text with dollar signs and commas. Clean the text, then convert with coerce, so bad entries become missing instead of crashing the script. Then decide on purpose: drop, fill, or flag. Filling with zero quietly lowers every average.
```

```quiz
q: What does pd.Series([10, None, 20]).mean() return?
options:
  - 10.0
  - 15.0
  - NaN
answer: 1
why: mean skips the missing value and averages the two known ones, (10 + 20) / 2.
```

## Clean in a fixed order

Fix the **grain** first: one row means one order. Then every later step is safe. After each step, print `len(frame)`. A number that moves when you did not expect it is the bug.

```svg Row counts after each step on a sample: only dedupe and bad amounts may shrink the table, and the merge must keep it at 6
<svg viewBox="0 0 520 190" role="img" aria-label="Five cleaning steps with row counts">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="raw">
      <rect x="14" y="40" width="90" height="64" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="59" y="66" text-anchor="middle" fill="var(--fg)">raw</text>
      <text x="59" y="90" text-anchor="middle" fill="var(--fg)">9 rows</text>
    </g>
    <g data-cue="dedupe">
      <path d="M104 72 L118 72" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <rect x="118" y="40" width="90" height="64" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="163" y="66" text-anchor="middle" fill="var(--fg)">dedupe</text>
      <text x="163" y="90" text-anchor="middle" fill="var(--fg)">8 rows</text>
    </g>
    <g data-cue="parse">
      <path d="M208 72 L222 72" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <rect x="222" y="40" width="90" height="64" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="267" y="66" text-anchor="middle" fill="var(--fg)">parse</text>
      <text x="267" y="90" text-anchor="middle" fill="var(--fg)">6 rows</text>
    </g>
    <g data-cue="merge">
      <path d="M312 72 L326 72" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <rect x="326" y="40" width="90" height="64" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="3"/>
      <text x="371" y="66" text-anchor="middle" fill="var(--fg)">merge</text>
      <text x="371" y="90" text-anchor="middle" fill="var(--fg)">6 rows</text>
    </g>
    <g data-cue="group">
      <path d="M416 72 L430 72" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <rect x="430" y="40" width="76" height="64" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="468" y="66" text-anchor="middle" fill="var(--fg)">group</text>
      <text x="468" y="90" text-anchor="middle" fill="var(--fg)">3 rows</text>
    </g>
  </g>
  <g font-family="var(--font-mono)" font-size="12" fill="var(--fg-muted)">
    <text x="14" y="140">same order_id twice</text>
    <text x="14" y="160">n/a and blanks go</text>
    <text x="326" y="140">must not change!</text>
  </g>
</svg>
```

```narrate
Follow the row counts. [[raw]] We start with nine raw rows. [[dedupe]] Removing the repeated order id leaves eight. [[parse]] Turning amounts into numbers and dropping the ones that are not numbers leaves six. [[merge]] The merge is the step to watch. It must keep six rows, so if it changes the count, a duplicate key slipped in. [[group]] Finally, grouping gives one row per segment, here three.
```

> **Trap:** cleaning the **lookup** table last. De-duplicate customers before the merge, not after the totals went wrong.

## Your turn

Open `order_summary.py` and implement `summarize_orders(orders, customers)`.

- `orders`: `order_id`, `customer_id`, `amount` (text like `"$1,200.50"`, `"n/a"`, or `None`)
- `customers`: `customer_id`, `segment` (messy case and spaces, maybe missing; a customer can be listed twice)

Rules:

- Same `order_id` twice: keep the first
- `amount`: strip `$` and `,`, convert to a number. A value that is not a number is dropped, not counted as 0
- `segment`: strip spaces, lowercase. Duplicate customers: keep the first. No customer or no segment: `"unknown"`
- Return columns `segment`, `order_count`, `revenue`, `average_order_value`, one row per segment, sorted by `segment`
- Do not change the frames you were given

```hint
Write small helpers: one that cleans orders, one that cleans customers, then summarize_orders just merges and aggregates them.
```

```hint
For amounts: astype(str), then .str.replace(r"[$,]", "", regex=True), then pd.to_numeric(..., errors="coerce"). Drop the NaN rows afterwards with dropna(subset=["amount"]).
```

```hint
Merge orders into customers with how="left" and validate="many_to_one", fillna("unknown") on segment, then groupby("segment", as_index=False).agg(...) with named aggregation.
```
