---
title: Concurrency and optimistic locking
lang: ts
minutes: 25
level: mid
roles: [backend]
files: [products.ts]
sources:
  - https://www.postgresql.org/docs/current/transaction-iso.html
  - https://www.postgresql.org/docs/current/explicit-locking.html
  - https://www.postgresql.org/docs/current/dml-returning.html
  - https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests
---

## The lost update

Two sellers sell the last keyboards at the same moment. Both **read** `stock = 10`. Both compute 9 and **write** 9. The shop sold two, and the table says one.

No error. No log. Each statement was valid. The bug is the **gap** between the read and the write: in PostgreSQL's default level, two reads in a row can see different data, because other transactions commit in between.

> **Why:** a lost update is a silent data bug, the worst kind. Interviewers ask about it to see if you notice the gap.

> **Not this:** checking in app code ("if stock > 0 then update") and hoping nobody is faster. That check is stale the moment you run it.

```svg Both sellers read 10, so the second write erases the first sale
<svg viewBox="0 0 520 210" role="img" aria-label="Two sellers overwrite each other">
  <g font-family="var(--font-mono)" font-size="13">
    <text x="80" y="20" text-anchor="middle" fill="var(--fg-muted)">database</text>
    <text x="250" y="20" text-anchor="middle" fill="var(--fg-muted)">seller A</text>
    <text x="410" y="20" text-anchor="middle" fill="var(--fg-muted)">seller B</text>
    <g data-cue="reads">
      <rect x="190" y="32" width="120" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="250" y="51" text-anchor="middle" fill="var(--fg)">read: 10</text>
      <rect x="350" y="68" width="120" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="410" y="87" text-anchor="middle" fill="var(--fg)">read: 10</text>
    </g>
    <g data-cue="writes">
      <rect x="190" y="104" width="120" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="250" y="123" text-anchor="middle" fill="var(--fg)">write: 9</text>
      <rect x="350" y="140" width="120" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="410" y="159" text-anchor="middle" fill="var(--fg)">write: 9</text>
    </g>
    <g data-cue="lost">
      <rect x="20" y="104" width="120" height="64" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="3"/>
      <text x="80" y="130" text-anchor="middle" fill="var(--fg)">stock = 9</text>
      <text x="80" y="152" text-anchor="middle" fill="var(--danger)">should be 8</text>
    </g>
  </g>
</svg>
```

```narrate
Read it top to bottom. [[reads]] Seller A reads a stock of ten. Before A writes anything, seller B reads ten too. [[writes]] A writes nine. Then B, who still believes the stock is ten, also writes nine. [[lost]] The database ends at nine instead of eight. One sale was erased, and nothing complained.
```

## A version column

Add `version int`. Read it with the row. Write only if it is **unchanged**, and bump it in the same statement:

```sql
UPDATE products
SET stock = $3, version = version + 1
WHERE id = $1 AND version = $2
RETURNING id, name, stock, version;
```

One row back: you won. **Zero rows**: someone changed it first, so you lost.

> **Why:** the check and the write are one atomic statement. PostgreSQL makes a waiting updater re-check `WHERE` against the freshly committed row, so a stale `version` no longer matches.

> **Not this:** `SELECT ... FOR UPDATE` for every edit. It blocks others while you hold the lock, and a person staring at a form can hold it for minutes.

```svg Same version in the WHERE: the first update matches, the second matches nothing
<svg viewBox="0 0 520 210" role="img" aria-label="Two updates with the same version, one wins">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="first">
      <rect x="20" y="20" width="220" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="42" fill="var(--fg)">A: WHERE version = 1</text>
      <path d="M240 37 L290 37" stroke="var(--ok)" stroke-width="2"/>
      <rect x="290" y="20" width="200" height="34" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="300" y="42" fill="var(--fg)">1 row, now v2</text>
    </g>
    <g data-cue="second">
      <rect x="20" y="72" width="220" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="94" fill="var(--fg)">B: WHERE version = 1</text>
      <path d="M240 89 L290 89" stroke="var(--danger)" stroke-width="2"/>
      <rect x="290" y="72" width="200" height="34" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="300" y="94" fill="var(--fg)">0 rows: conflict</text>
    </g>
    <g data-cue="now">
      <text x="20" y="150" fill="var(--fg)">the row is at version 2 now,</text>
      <text x="20" y="170" fill="var(--fg)">so B finds no match and changes nothing</text>
    </g>
  </g>
</svg>
```

```narrate
Both sellers read version one. [[first]] Seller A updates with where version equals one. It matches, one row changes, and the version becomes two. [[second]] Seller B sends the same condition. [[now]] But the row is at version two now, so nothing matches, zero rows change, and B learns it lost. No locks were held while anyone was thinking.
```

## Tell the client: 409

On a miss, never overwrite. Answer **`409 Conflict`** and include the **current** row, so the client can re-read and decide.

| Version travels in | Failure status |
|---|---|
| the body (`"version": 1`) | `409 Conflict` |
| `If-Match: "1"` header | `412 Precondition Failed` |

```json
{ "error": "The product changed since you read it", "current": { "id": 1, "stock": 9, "version": 2 } }
```

Fowler calls the pattern an **Optimistic Offline Lock**: assume conflicts are rare, and detect them at write time instead of blocking.

```narrate
When the version check misses, the API must not overwrite. It answers conflict, four oh nine, and includes the current row so the client can reload and decide. If the version travels in an if match header instead, the standard status is precondition failed, four twelve. Either way the idea is optimistic: assume conflicts are rare, and just detect them.
```

```quiz
q: An UPDATE ... WHERE id = 1 AND version = 3 reports 0 rows changed, and the product exists. What happened?
options:
  - The product does not exist, so return 404
  - Someone else changed it first, so return 409
  - The database is broken, so return 500
answer: 1
why: A missing product would also report 0 rows, so look the row up. If it exists, its version is no longer 3, which is a conflict.
```

## Retry, or hand it back?

Who decides what the new value is?

- **The server computes it from the row** ("stock minus one"): re-read and **retry** a few times. Cap the attempts
- **A person typed it** into a form they loaded earlier: do **not** auto-retry. Return `409` and let them see the newer data

> **Why:** a retry recomputes from fresh data, so it is safe. Replaying a stale human edit would silently erase someone else's work.

> **Not this:** read-modify-write for a plain counter. One atomic statement is simpler: `UPDATE products SET stock = stock - 1 WHERE id = $1 AND stock > 0`.

Pessimistic locking (`FOR UPDATE`) makes sense when conflicts are **frequent** and a retry would rarely win.

```narrate
Who decides the new value? If the server computes it from the current row, like stock minus one, then re-reading and retrying a few times is safe. If a person typed it into a form they loaded earlier, do not retry, because you would erase a colleague's change. Hand back the conflict. And for a plain counter, skip all this and use one atomic update.
```

## Your turn

Open `products.ts`. `findProduct` is given. Implement three functions on the `products` table (`id`, `name`, `stock`, `version`):

- `updateWithVersion({ db, id, expectedVersion, changes })`: one `UPDATE ... WHERE id AND version`, bumping `version`. Return `{ outcome: "updated", product }`, or `{ outcome: "conflict", current }` if the row exists, or `{ outcome: "not_found" }`
- `updateWithRetry({ db, id, change, maxAttempts })`: read the row, call `change(current)` to get the new values, try the update. On conflict read again and retry, up to `maxAttempts` tries. Then return the last conflict
- `toResponse(result)`: `200` with the product, `409` with `{ error, current }`, `404`

```hint
Use `RETURNING id, name, stock, version`. If `rows[0]` exists you won. If not, call `findProduct` to tell a conflict from a missing row.
```

```hint
`updateWithRetry`: call `findProduct`, return `not_found` early if it is null, then `await change(current)` and call `updateWithVersion` with `current.version`.
```

```hint
Retry by calling `updateWithRetry` again with `maxAttempts - 1`. Stop when the result is not a conflict, or when `maxAttempts` is 1 or less.
```
