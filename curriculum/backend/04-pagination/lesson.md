---
title: Pagination
lang: ts
minutes: 25
level: junior
roles: [backend]
files: [listPosts.ts]
sources:
  - https://www.postgresql.org/docs/current/queries-limit.html
  - https://www.postgresql.org/docs/current/functions-comparisons.html
  - https://docs.stripe.com/api/pagination
  - https://google.aip.dev/158
---

## Offset: simple, and wrong at scale

`LIMIT 20 OFFSET 40` gives page 3. Easy, and it breaks in two ways.

- **Slow.** PostgreSQL docs: "The rows skipped by an OFFSET clause still have to be computed inside the server; therefore a large OFFSET might be inefficient." Page 5000 reads 100,000 rows and throws them away.
- **Drifts.** Rows are counted by position. If a row is inserted between two requests, everything shifts by one.

```svg A new row 13 pushes row 10 into page 2, so the client sees it twice
<svg viewBox="0 0 520 200" role="img" aria-label="Offset pagination repeating a row after an insert">
  <g data-cue="first" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="38" fill="var(--fg-muted)">page 1</text>
    <rect x="100" y="16" width="40" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="120" y="38" text-anchor="middle" fill="var(--fg)">12</text>
    <rect x="144" y="16" width="40" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="164" y="38" text-anchor="middle" fill="var(--fg)">11</text>
    <rect x="188" y="16" width="40" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="208" y="38" text-anchor="middle" fill="var(--fg)">10</text>
  </g>
  <g data-cue="insert" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="108" fill="var(--fg-muted)">page 2</text>
    <rect x="56" y="86" width="40" height="34" fill="var(--surface-3)" stroke="var(--accent-2)" stroke-width="3"/>
    <text x="76" y="108" text-anchor="middle" fill="var(--fg)">13</text>
    <rect x="100" y="86" width="40" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="120" y="108" text-anchor="middle" fill="var(--fg)">12</text>
    <rect x="144" y="86" width="40" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="164" y="108" text-anchor="middle" fill="var(--fg)">11</text>
  </g>
  <g data-cue="repeat" font-family="var(--font-mono)" font-size="14">
    <rect x="188" y="86" width="40" height="34" fill="var(--primary-container)" stroke="var(--danger)" stroke-width="3"/>
    <text x="208" y="108" text-anchor="middle" fill="var(--fg)">10</text>
    <rect x="232" y="86" width="40" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="252" y="108" text-anchor="middle" fill="var(--fg)">9</text>
    <rect x="276" y="86" width="40" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="296" y="108" text-anchor="middle" fill="var(--fg)">8</text>
    <text x="20" y="160" fill="var(--danger)">OFFSET 3 now starts at 10: seen twice</text>
  </g>
</svg>
```

```narrate
Page one shows posts twelve, eleven and ten. [[first]] That is the top row. [[insert]] Before the client asks for page two, a new post, number thirteen, arrives at the front. Everything shifts one place to the right. [[repeat]] Skipping three rows now lands on post ten again, so the client sees it twice. Offset counts positions, and positions move.
```

> **Why:** offset is fine for small, static tables where a person jumps to "page 7". It is the wrong default for feeds and big tables.

## Keyset: "what comes after this row?"

Remember the **last row's sort values** and ask for rows after them:

```sql
SELECT id, title, created_at::text AS "createdAt" FROM posts
WHERE (created_at, id) < ($1::timestamptz, $2::int)
ORDER BY created_at DESC, id DESC
LIMIT 21;
```

The row comparison works left to right, like a dictionary. With an index on `(created_at DESC, id DESC)`, Postgres jumps straight to the spot. Page 5000 costs the same as page 1.

> **Why:** it filters by **value**, not by position, so inserts and deletes elsewhere cannot shift your place.

> **Trap:** the sort must be **unique**. Many rows can share one `created_at`. Add `id` as a tie-breaker, or rows vanish at page borders.

```svg The cursor is the last row seen. The next page starts right after it
<svg viewBox="0 0 520 210" role="img" aria-label="Keyset cursor marking the last seen row">
  <g data-cue="sorted" font-family="var(--font-mono)" font-size="14">
    <rect x="20" y="16" width="200" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="32" y="36" fill="var(--fg)">12  day 3</text>
    <rect x="20" y="48" width="200" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="32" y="68" fill="var(--fg)">11  day 3</text>
    <rect x="20" y="80" width="200" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="32" y="100" fill="var(--fg)">10  day 3</text>
  </g>
  <g data-cue="cursor" font-family="var(--font-mono)" font-size="14">
    <path d="M220 95 L290 95" stroke="var(--accent-2)" stroke-width="3"/>
    <text x="300" y="92" fill="var(--fg)">cursor =</text>
    <text x="300" y="112" fill="var(--fg)">(day 3, 10)</text>
  </g>
  <g data-cue="next" font-family="var(--font-mono)" font-size="14">
    <rect x="20" y="124" width="200" height="30" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
    <text x="32" y="144" fill="var(--fg)">9   day 3</text>
    <rect x="20" y="156" width="200" height="30" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
    <text x="32" y="176" fill="var(--fg)">8   day 2</text>
    <text x="240" y="150" fill="var(--fg)">next page: rows after the cursor</text>
  </g>
</svg>
```

```narrate
Rows are sorted newest first. [[sorted]] The first page ended at post ten. [[cursor]] The server hands the client a cursor, which is just the sort values of that last row: day three, and id ten. [[next]] The next request asks for rows strictly after that point, and the database jumps straight there using the index. Nothing is skipped and nothing is counted.
```

## The cursor and the page shape

Return the items plus where to continue:

```json
{ "items": [ ... ], "nextCursor": "eyJjcmVhdGVkQXQiOi..." }
```

- Fetch `limit + 1` rows. If you got the extra one there is a next page, so you need no `COUNT(*)`
- `nextCursor` is `null` on the last page
- The cursor is **opaque**: base64 of the sort values. Clients pass it back untouched (Stripe: `starting_after`, Google AIP-158: `page_token`)
- A cursor comes from the client, and base64 hides nothing. **Parse it** like any input, and pass it to SQL as parameters, never pasted into the text. Garbage gives an error, not a crash

> **Trap:** keep the timestamp as text. A JavaScript `Date` keeps milliseconds, Postgres keeps microseconds, and the lost digits make rows repeat.

```narrate
The response is a list plus a cursor for the next page, or null at the end. A neat trick: ask the database for one more row than the limit. If it comes back, you know another page exists, with no counting query. Treat the cursor as client input and parse it. And keep timestamps as text, because a JavaScript date silently drops microseconds.
```

```quiz
q: Two posts have the same created_at. Keyset paging orders by created_at only. What goes wrong?
options:
  - Nothing, equal values are always returned together
  - Rows that tie across a page border can be skipped or repeated
  - The query becomes slower than OFFSET
answer: 1
why: The cursor cannot say which of the tied rows it stopped at. A unique tie-breaker such as id makes every position exact.
```

## Which one do you pick?

| | OFFSET | Keyset |
|---|---|---|
| Jump to page 7 | yes | no, only next |
| Cost of a deep page | grows with depth | same as page 1 |
| Stable under inserts | no | yes |
| Fits | small admin tables | feeds, large tables, sync |

> **Not this:** offset as the default for a public API. It looks simple on day one, and on day 300 it is slow and shows duplicates.

In an interview, say the trade-off in one breath: "offset for jumping, keyset for scale and stability".

```narrate
In an interview, give the trade-off in one breath. Offset lets you jump to any page, but it gets slower the deeper you go and it drifts when data changes. Keyset can only go forward and back, but it stays fast and stable. Pick offset for small admin tables, and keyset for feeds and anything that grows.
```

## Your turn

Open `listPosts.ts`. `encodeCursor` and `decodeCursor` are given. Implement `listPosts({ db, limit, cursor })` for a `posts` table, newest first:

- Sort by `created_at DESC, id DESC`
- With a `cursor`, return only rows **after** it, using a row comparison
- Return `{ items, nextCursor }`. `nextCursor` is `null` on the last page, and an exact fit gives no empty page
- `items` have `id`, `title` and `createdAt` as **text**
- A bad cursor must throw

The tests insert and delete rows between pages on three datasets, one with posts that tie to the microsecond.

```hint
Two queries are easiest: one for the first page (no `WHERE`), one with `WHERE (created_at, id) < ($1::timestamptz, $2::int)`. Both end with the same `ORDER BY` and `LIMIT`.
```

```hint
Ask the database for `limit + 1` rows, never the whole table. Keep the first `limit` as `items`. If there were more than `limit` rows, `nextCursor` is `encodeCursor` of the last item.
```

```hint
Select `created_at::text AS "createdAt"`. The text keeps every microsecond, so it round-trips through the cursor exactly.
```
