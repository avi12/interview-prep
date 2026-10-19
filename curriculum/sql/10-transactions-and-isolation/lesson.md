---
title: Transactions and isolation
lang: ts
minutes: 30
level: junior
roles: [backend]
files: [transfer.ts]
sources:
  - https://www.postgresql.org/docs/current/tutorial-transactions.html
  - https://www.postgresql.org/docs/current/transaction-iso.html
  - https://www.postgresql.org/docs/current/explicit-locking.html
  - https://pglite.dev/docs/api
---

## ACID in plain words

A **transaction** groups several statements into one unit. Databases promise four things about it, known as **ACID**:

| Letter | Promise | Plain words |
|---|---|---|
| **A**tomic | all or nothing | a failure halfway undoes the first half |
| **C**onsistent | rules always hold | constraints like `balance >= 0` are never broken |
| **I**solated | no peeking | other sessions do not see your half-done work |
| **D**urable | survives a crash | once committed, it stays committed |

> **Why:** interviewers ask "what is ACID?" to see if you can connect it to a real bug, like money vanishing. The next cards do exactly that.

```narrate
A transaction bundles several statements into one unit. Databases promise four things about it, known as A C I D. Atomic means all or nothing. Consistent means the rules always hold. Isolated means other sessions do not see your half finished work. Durable means a committed change survives a crash.
```

## Atomic: all or nothing

Moving 50 from Dana to Omer takes two updates. If the program dies between them, money vanishes.

```sql
BEGIN;
UPDATE accounts SET balance_cents = balance_cents - 5000 WHERE id = 1;
UPDATE accounts SET balance_cents = balance_cents + 5000 WHERE id = 2;
COMMIT;
```

If anything fails, `ROLLBACK` undoes every step since `BEGIN`.

```svg The debit succeeds, the credit fails, and the rollback puts Dana's money back
<svg viewBox="0 0 520 190" role="img" aria-label="Debit, failed credit, rollback">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="debit">
      <rect x="20" y="20" width="140" height="64" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="44" fill="var(--fg)">1. debit Dana</text>
      <text x="30" y="68" fill="var(--ok)">ok  100 -> 50</text>
    </g>
    <g data-cue="fail">
      <path d="M160 52 L190 52" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="190" y="20" width="140" height="64" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="200" y="44" fill="var(--fg)">2. credit Omer</text>
      <text x="200" y="68" fill="var(--danger)">fails: no account</text>
    </g>
    <g data-cue="undo">
      <path d="M330 52 L360 52" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="360" y="20" width="140" height="64" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="370" y="44" fill="var(--fg)">ROLLBACK</text>
      <text x="370" y="68" fill="var(--fg)">Dana back to 100</text>
    </g>
    <text x="20" y="130" fill="var(--fg)">Without a transaction, step 1 stays: 50 is gone.</text>
  </g>
</svg>
```

```narrate
Follow the three boxes. [[debit]] First we take fifty from Dana, and that works. [[fail]] Then crediting Omer fails, maybe because the account does not exist. [[undo]] Rollback undoes the first step, so Dana is back to one hundred. Without a transaction, that first step would stay, and the money would be gone.
```

> **Not this:** two separate calls with no `BEGIN`. Each statement commits on its own, so a failure between them leaves half a transfer.

## The lost update

Two sessions add to the same balance. Each **reads** 100 in the app, computes a new number, and **writes it back**.

```sql
SELECT balance_cents FROM accounts WHERE id = 1;
UPDATE accounts SET balance_cents = 90 WHERE id = 1;
```

```svg Both sessions read 100, so the second write silently erases the first
<svg viewBox="0 0 520 220" role="img" aria-label="Two interleaved sessions and a lost update">
  <g font-family="var(--font-mono)" font-size="13">
    <text x="20" y="22" fill="var(--fg-muted)">session A: pays 10</text>
    <text x="290" y="22" fill="var(--fg-muted)">session B: pays 20</text>
    <g data-cue="reads">
      <rect x="20" y="34" width="210" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="54" fill="var(--fg)">reads balance: 100</text>
      <rect x="290" y="34" width="210" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="300" y="54" fill="var(--fg)">reads balance: 100</text>
    </g>
    <g data-cue="writeA">
      <rect x="20" y="78" width="210" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="98" fill="var(--fg)">writes 90</text>
    </g>
    <g data-cue="writeB">
      <rect x="290" y="122" width="210" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="300" y="142" fill="var(--fg)">writes 80</text>
    </g>
    <g data-cue="lost">
      <text x="20" y="190" fill="var(--danger)">final balance 80, should be 70</text>
    </g>
  </g>
</svg>
```

```narrate
Two sessions, time flows down. [[reads]] Both read a balance of one hundred. [[writeA]] Session A pays ten and writes ninety. [[writeB]] Session B still believes the balance is one hundred, pays twenty, and writes eighty. [[lost]] The final balance is eighty. It should be seventy. Session A's payment was silently erased.
```

> **Trap:** wrapping the read and the write in `BEGIN ... COMMIT` does **not** fix this at the default level. Both transactions can still read 100.

## Two fixes

**1. One atomic `UPDATE`.** Let the database do the math.

```sql
UPDATE accounts
SET balance_cents = balance_cents - 1000
WHERE id = 1 AND balance_cents >= 1000;
```

The row is locked while it changes. A second session waits, then re-reads the **new** value. The `AND balance_cents >= 1000` check and the write happen in one step, and zero rows changed means "not enough money".

**2. Lock the row first.**

```sql
BEGIN;
SELECT balance_cents FROM accounts WHERE id = 1 FOR UPDATE;
UPDATE accounts SET balance_cents = 90 WHERE id = 1;
COMMIT;
```

`FOR UPDATE` blocks other writers of that row until you commit.

> **Why:** prefer the atomic `UPDATE`. It is one round trip and cannot be forgotten. Use `FOR UPDATE` when your code must decide something between the read and the write.

> **Not this:** read the balance, compute in your app, write the absolute number back.

```narrate
There are two fixes. First, a single atomic update. The database subtracts, and checks the balance, in one step, while it holds the row. A second session waits, then sees the new value. Second, select for update locks the row until you commit. Prefer the atomic update. Never read, compute in your app, and write back.
```

## What isolation levels change

**Isolation** decides how much of other sessions' work you can see. Postgres offers three real levels:

| Level | You see | If two sessions collide |
|---|---|---|
| **Read Committed** (default) | rows committed before **each statement** | the second update re-reads the new row and goes on |
| **Repeatable Read** | one snapshot (a frozen view of the data) for the **whole transaction** | the second update fails with a serialization error |
| **Serializable** | as if sessions ran one after another | may also fail with a serialization error |

Postgres treats `READ UNCOMMITTED` as Read Committed, so dirty reads never happen.

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
```

> **Trap:** a serialization error is not a bug. Abort and **retry the whole transaction** from `BEGIN`.

```narrate
Isolation decides how much of other sessions' work you can see. The default, read committed, sees whatever was committed before each statement. Repeatable read freezes one snapshot for the whole transaction, and a collision raises a serialization error. Serializable behaves as if sessions ran one after another. When you get that error, retry the whole transaction.
```

```quiz
q: Your code gets the error "could not serialize access due to concurrent update". What should it do?
options:
  - Ignore it and continue with the next statement
  - Abort the transaction and retry it from the start
  - Switch to Read Uncommitted
answer: 1
why: The database refused the write to protect correctness. The whole transaction must be re-run on a fresh snapshot.
```

## Your turn

`transfer.ts` exports `transfer({ db, fromId, toId, amountCents })` over an `accounts(id, owner, balance_cents)` table where `balance_cents >= 0` is enforced. The starter credits first and debits second, with no transaction.

Make it safe:

- Move the money in **one transaction**. On any failure, throw, and leave **both** balances unchanged
- Throw when the sender lacks the money, when the recipient does not exist, and when the amount is not above 0
- Simultaneous transfers must not overdraw the sender. PGlite has one connection, so no test can show a real race: use the guarded `UPDATE`
- PGlite: `db.transaction(async tx => { ... })` rolls back when the callback throws, and `result.affectedRows` tells how many rows an `UPDATE` changed

```hint
Wrap both UPDATE statements in db.transaction(async tx => ...) and use tx.query, not db.query, inside it.
```

```hint
Debit with a guard: UPDATE accounts SET balance_cents = balance_cents - $1 WHERE id = $2 AND balance_cents >= $1. Zero affectedRows means the sender cannot pay.
```

```hint
Credit second. If that UPDATE changes zero rows, the recipient is missing: throw, and the transaction rolls the debit back. Reject an amount of 0 or less before opening the transaction.
```
