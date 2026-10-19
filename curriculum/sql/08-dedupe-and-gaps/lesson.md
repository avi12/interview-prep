---
title: Dedupe, gaps and islands
lang: sql
minutes: 30
level: junior
roles: [analyst, backend]
files: [dedupe.sql, islands.sql]
sources:
  - https://www.postgresql.org/docs/current/functions-window.html
  - https://www.postgresql.org/docs/current/sql-delete.html
  - https://prachub.com/resources/sql-gaps-and-islands
---

## Duplicates, and the choice behind them

"The same person is in the table three times. Clean it up."

Before you write SQL, ask: **which copy survives?** The newest? The oldest? The most complete? That choice is the real question. The SQL just carries it out.

`SELECT DISTINCT` does not help here. It only hides rows that are identical in **every** column, and duplicates usually differ in `id` or `created_at`.

```narrate
Interviewers say: this table has duplicates, clean it up. The first thing to say out loud is which copy should survive. Newest, oldest, or the most complete one. Select distinct will not save you, because duplicates almost always differ in some column, like the id or the date.
```

## Number the copies

`ROW_NUMBER()` with `PARTITION BY` the duplicate key numbers each copy 1, 2, 3 inside its group. The `ORDER BY` decides who gets 1, the survivor.

```sql
SELECT id, email, created_at,
       ROW_NUMBER() OVER (
         PARTITION BY LOWER(email)
         ORDER BY created_at DESC, id DESC
       ) AS copy_number
FROM contacts;
```

Copy 1 stays. Every row with `copy_number > 1` goes.

```svg One email, three copies: the newest gets number 1 and survives, the rest get 2 and 3 and are deleted
<svg viewBox="0 0 520 190" role="img" aria-label="Three copies numbered by newest first">
  <g font-family="var(--font-mono)" font-size="13">
    <text x="20" y="22" fill="var(--fg-muted)">PARTITION BY LOWER(email)  ORDER BY created_at DESC</text>
    <g data-cue="keep">
      <rect x="20" y="36" width="330" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="57" fill="var(--fg)">id 2  Dana@X.com  Jan 5</text>
      <text x="370" y="57" fill="var(--ok)">1  keep</text>
    </g>
    <g data-cue="drop">
      <rect x="20" y="76" width="330" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="97" fill="var(--fg)">id 1  dana@x.com  Jan 1</text>
      <text x="370" y="97" fill="var(--danger)">2  delete</text>
      <rect x="20" y="116" width="330" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="137" fill="var(--fg)">id 9  dana@x.com  Dec 30</text>
      <text x="370" y="137" fill="var(--danger)">3  delete</text>
    </g>
    <g data-cue="lower">
      <path d="M20 168 L350 168" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="20" y="184" fill="var(--fg)">LOWER makes Dana@X.com and dana@x.com one group</text>
    </g>
  </g>
</svg>
```

```narrate
Look at one email with three copies. [[keep]] The newest row gets number one, and that is the survivor. [[drop]] The older copies get two and three, and those are the ones to delete. [[lower]] Notice the lowercase trick. Without it, a capital letter makes the same person look like two different people.
```

## Preview with SELECT, then DELETE

Always run the `SELECT` first and read the rows. Then turn it into a `DELETE`. A window function cannot sit in `DELETE ... WHERE`, so number the rows in a CTE and delete by `id`.

```sql
WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at DESC, id DESC) AS copy_number
  FROM contacts
)
DELETE FROM contacts
WHERE id IN (SELECT id FROM numbered WHERE copy_number > 1)
RETURNING id;
```

`RETURNING` lists exactly what was deleted, a receipt you can check.

> **Why:** a unique `id` is what lets you point at one physical copy. Without it you would reach for `ctid`, Postgres' internal row address.

> **Not this:** `DELETE FROM contacts WHERE email IN (SELECT email ... HAVING COUNT(*) > 1)`. It deletes **every** copy, survivor included.

> **Trap:** after the cleanup, add a `UNIQUE` index on `LOWER(email)`. Otherwise the duplicates come back next week.

```narrate
Run the select first and read it. Then turn it into a delete. The window function lives in a common table expression, and the delete picks rows by id. The returning clause hands you a receipt of what vanished. And once the table is clean, add a unique index, or the duplicates return.
```

```quiz
q: Which ORDER BY inside ROW_NUMBER keeps the newest copy, and picks the same winner on a tie?
options:
  - ORDER BY created_at
  - ORDER BY created_at DESC, id DESC
  - ORDER BY id
answer: 1
why: DESC puts the newest first, so it gets number 1. The extra id breaks ties, so the survivor is never random.
```

## Gaps and islands

A **streak** is a run of consecutive days: an **island**. The holes between runs are **gaps**. "Longest login streak per user" is the classic question.

The trick: number the days, then subtract that number from the date.

| login_day | row number | day minus number |
|---|---|---|
| Jan 1 | 1 | Dec 31 |
| Jan 2 | 2 | Dec 31 |
| Jan 3 | 3 | Dec 31 |
| Jan 5 | 4 | Jan 1 |

Inside a run, the date and the number both rise by 1, so the difference stays **constant**. A missing day breaks it, and a new island key starts.

```svg Consecutive days share one key; a gap changes the key
<svg viewBox="0 0 520 210" role="img" aria-label="Date minus row number gives one key per island">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="days">
      <text x="20" y="22" fill="var(--fg-muted)">day</text>
      <text x="20" y="62" fill="var(--fg)">Jan 1</text>
      <text x="20" y="92" fill="var(--fg)">Jan 2</text>
      <text x="20" y="122" fill="var(--fg)">Jan 3</text>
      <text x="20" y="152" fill="var(--fg)">Jan 5</text>
    </g>
    <g data-cue="number">
      <text x="120" y="22" fill="var(--fg-muted)">row_number</text>
      <text x="150" y="62" fill="var(--fg)">1</text>
      <text x="150" y="92" fill="var(--fg)">2</text>
      <text x="150" y="122" fill="var(--fg)">3</text>
      <text x="150" y="152" fill="var(--fg)">4</text>
    </g>
    <g data-cue="key">
      <text x="240" y="22" fill="var(--fg-muted)">day - number</text>
      <rect x="236" y="40" width="110" height="90" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="250" y="62" fill="var(--fg)">Dec 31</text>
      <text x="250" y="92" fill="var(--fg)">Dec 31</text>
      <text x="250" y="122" fill="var(--fg)">Dec 31</text>
      <rect x="236" y="134" width="110" height="26" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="250" y="152" fill="var(--fg)">Jan 1</text>
    </g>
    <g data-cue="islands">
      <text x="370" y="82" fill="var(--accent-2)">island 1: 3 days</text>
      <text x="370" y="152" fill="var(--accent-2)">island 2: 1 day</text>
    </g>
  </g>
</svg>
```

```narrate
Here is the trick. [[days]] These are the login days for one user. [[number]] Number them one, two, three, four. [[key]] Now subtract the number from the day. The first three all give December thirty first, because both sides rise by one together. The gap makes the last one different. [[islands]] Same key means same island, so we get a three day streak and a one day streak.
```

## Build the islands

1. Reduce to **one row per user per day** first.
2. `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day)`.
3. `day - row_number::int` is the island key.
4. `GROUP BY user_id, key` and take `MIN`, `MAX`, `COUNT(*)`.

> **Trap:** two logins on one day get two row numbers, so the next day looks like a gap. Dedupe the days **before** numbering them.

To list the gaps instead, look at the next row with `LEAD`.

```sql
SELECT login_day, LEAD(login_day) OVER (ORDER BY login_day) AS next_day
FROM login_days;
```

A gap exists where `next_day - login_day > 1`.

```narrate
Four steps. One row per user per day first. Then number the days, subtract, and group by the key. Take the first day, the last day and the count. To see gaps instead, look at the next row with lead. A gap is wherever the next day is more than one day away.
```

```quiz
q: A user logged in on Jan 1, Jan 1 again, Jan 2. You number the rows WITHOUT removing the duplicate first. What goes wrong?
options:
  - Nothing, duplicates are ignored
  - The row numbers run 1, 2, 3 against the dates Jan 1, Jan 1, Jan 2, so the key changes and one streak splits in two
  - The query fails with an error
answer: 1
why: The date rises by 0 then 1 while the number rises by 1 each time, so the difference is not constant. Dedupe the days first.
```

## Your turn

Two queries, two files. Both run on two different datasets.

**`dedupe.sql`**: table `contacts(id, email, name, created_at)`. Write **one `DELETE`** that removes duplicates, comparing emails ignoring upper and lower case.

- Keep the newest row per email. On a tie in `created_at`, keep the highest `id`
- End with `RETURNING id`, so the tests see what you deleted

**`islands.sql`**: table `logins(user_id, logged_in_at)` where `logged_in_at` is a timestamp and users log in many times a day. Return every streak of consecutive calendar days.

- Columns: `user_id`, `streak_start`, `streak_end` (dates), `days`
- A single day is a streak of 1
- Sort by `user_id`, then `streak_start`

```hint
Dedupe: the starter is a SELECT preview. Fix its PARTITION BY and ORDER BY, then wrap it in a CTE and delete the rows with copy_number above 1.
```

```hint
Islands: cast the timestamp with logged_in_at::date and SELECT DISTINCT user_id and the day before numbering anything.
```

```hint
Islands: day - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day))::int is constant inside a streak. GROUP BY user_id and that value.
```
