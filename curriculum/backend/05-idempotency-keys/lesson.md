---
title: Idempotency keys
lang: ts
minutes: 25
level: mid
roles: [backend]
files: [idempotent.ts]
sources:
  - https://docs.stripe.com/api/idempotent_requests
  - https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
  - https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.html
  - https://www.rfc-editor.org/rfc/rfc9110.html
  - https://developer.mozilla.org/en-US/docs/Glossary/Idempotent
---

## Retries duplicate payments

A client sends `POST /payments`. The server charges the card. The response is lost on the way back. The client sees a timeout and cannot know if the money moved, so it retries. **The customer is charged twice.**

Retries also come from proxies, mobile apps on bad networks, and double clicks. RFC 9110 says a client should not automatically retry a non-idempotent method like `POST`, because of exactly this.

> **Why:** you cannot stop clients from retrying. You can make a retry **harmless**.

> **Not this:** "reject a payment with the same amount in the last five minutes". Two real purchases of the same amount get blocked, and the body alone cannot tell a retry from a new order.

```svg The reply is lost, so the retry charges the card again
<svg viewBox="0 0 520 230" role="img" aria-label="Sequence of a lost response causing a duplicate charge">
  <g font-family="var(--font-mono)" font-size="13">
    <text x="60" y="20" text-anchor="middle" fill="var(--fg)">client</text>
    <text x="230" y="20" text-anchor="middle" fill="var(--fg)">server</text>
    <path d="M60 30 L60 215" stroke="var(--border)" stroke-width="2"/>
    <path d="M230 30 L230 215" stroke="var(--border)" stroke-width="2"/>
    <g data-cue="send">
      <path d="M60 55 L226 55" stroke="var(--primary)" stroke-width="2"/>
      <text x="70" y="48" fill="var(--fg)">POST /payments</text>
      <rect x="244" y="42" width="130" height="26" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="254" y="60" fill="var(--fg)">charge $10</text>
    </g>
    <g data-cue="lost">
      <path d="M226 105 L64 105" stroke="var(--fg-muted)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="70" y="98" fill="var(--fg-muted)">201 ... lost</text>
      <path d="M120 92 L160 118 M160 92 L120 118" stroke="var(--danger)" stroke-width="3"/>
    </g>
    <g data-cue="retry">
      <path d="M60 155 L226 155" stroke="var(--primary)" stroke-width="2"/>
      <text x="70" y="148" fill="var(--fg)">retry, same POST</text>
      <rect x="244" y="142" width="150" height="26" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="254" y="160" fill="var(--fg)">charged twice</text>
    </g>
  </g>
</svg>
```

```narrate
Read it from the top. [[send]] The client posts a payment and the server charges ten dollars. [[lost]] The reply never arrives. The client only sees a timeout, so it has no idea whether the money moved. [[retry]] It sends the same post again, and the server, which remembers nothing, charges again. The customer paid twice.
```

## The Idempotency-Key header

The fix, popularized by Stripe: the **client** makes one unique key per intended operation and sends it on the `POST`.

```http
POST /payments
Idempotency-Key: 8b9f1c6e-4d5a-4f0e-9a1b-2c3d4e5f6a7b
```

The server stores the key with the result of the first run. A retry with the same key gets the **saved response** and runs nothing again.

- Stripe saves the status and body of the first request, even a `500`
- Keys are random strings (a V4 UUID), up to 255 characters, and Stripe may prune them after 24 hours
- The IETF draft (still a draft, now expired) names the cases: missing key `400`, key reused with a different payload `422`, original still running `409`

> **Why:** the key says "this is the same attempt", which a body never can.

```narrate
The client creates a random key for each thing it intends to do, and sends it in a header. The server saves the result of the first run under that key. If the same key shows up again, the server returns the saved answer and does no work. Stripe saves even failures. The key is how the server tells a retry from a brand new order.
```

## What the server stores

For each key, keep a **fingerprint** (a hash of the request body, with property order normalized) and the **state**: running, or done with its response.

```svg Four outcomes for a key, decided by what the server remembers
<svg viewBox="0 0 520 220" role="img" aria-label="Decision flow for an incoming idempotency key">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="new">
      <text x="20" y="28" fill="var(--fg-muted)">never seen</text>
      <rect x="20" y="40" width="190" height="30" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="30" y="60" fill="var(--fg)">1 reserve the key</text>
      <rect x="20" y="78" width="190" height="30" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="30" y="98" fill="var(--fg)">2 run the handler</text>
      <rect x="20" y="116" width="190" height="30" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="30" y="136" fill="var(--fg)">3 save the response</text>
    </g>
    <text x="250" y="28" fill="var(--fg-muted)">seen before</text>
    <g data-cue="replay">
      <rect x="250" y="40" width="250" height="30" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="260" y="60" fill="var(--fg)">same body, done: replay</text>
    </g>
    <g data-cue="busy">
      <rect x="250" y="78" width="250" height="30" fill="var(--surface-2)" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="260" y="98" fill="var(--fg)">still running: 409</text>
    </g>
    <g data-cue="mismatch">
      <rect x="250" y="116" width="250" height="30" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="260" y="136" fill="var(--fg)">different body: 422</text>
    </g>
  </g>
</svg>
```

```narrate
Two groups. [[new]] A key the server has never seen is reserved first, then the handler runs, then the response is saved. Reserving first is the important part. A key it has seen before ends in one of three ways. [[replay]] Same body and finished: send back the saved response. [[busy]] Still running: answer conflict. [[mismatch]] A different body: refuse, because the client is misusing the key.
```

> **Trap:** check-then-act. If you run the handler and **then** save the key, two simultaneous requests both pass the "not seen" check and both charge. Reserve the key **before** the work. In SQL, make the key a `PRIMARY KEY` and insert it first: only one request can win the insert.

## Decisions you can defend

| Question | A good answer | Because |
|---|---|---|
| Handler crashes midway | release the key | the client may retry, and the work never finished |
| Handler returns an error response | save and replay it | it is a real answer |
| Request fails validation before any work | do not save | nothing ran, so a corrected retry should proceed |
| How long to keep keys | hours to days | the table must not grow forever |
| Key scope | per account | two customers must never collide |
| Which methods | `POST`, `PATCH` | `GET`, `PUT`, `DELETE` are idempotent already |

> **Not this:** a key made from the order data (such as the email). Two real orders then share one key.

```narrate
Expect follow-up questions, and have a reason ready for each. If the handler crashes, release the key so the client can retry. If it returns an error, save it, because that is a real answer. Keep keys for a limited time, and scope them to the account. Only the methods that are not already idempotent need a key.
```

```quiz
q: A client retries POST /payments with the same key while the first request is still being processed. What should the server answer?
options:
  - 201, and charge again to be safe
  - 409 Conflict, and run nothing
  - 200 with the saved response
answer: 1
why: There is no saved response yet. Running it again would double charge, so the server says the original is still in progress and lets the client retry later.
```

## Your turn

Open `idempotent.ts`. `fingerprintOf(body)` is given. Implement `createIdempotentHandler({ handler })`. It returns an async function that takes `{ headers, body }`. Header names arrive in lowercase.

- No `idempotency-key` header: `400`
- First use of a key: run `handler({ body })`, save and return its response
- Same key, same body: return the saved response plus the header `idempotent-replayed: true`. The handler is **not** called
- Same key, different body: `422`
- Same key while the first is still running: `409`
- If `handler` throws, forget the key and rethrow

```hint
Keep a `Map` from key to `{ fingerprint, response? }`. A record without a `response` means "still running".
```

```hint
Check the order: mismatching fingerprint (422) first, then a saved response (replay), then a record without a response (409).
```

```hint
Call `records.set(key, { fingerprint })` **before** `await handler(...)`, with no `await` in between. That is the reservation that stops two simultaneous requests.
```

```hint
After the handler returns, store the response with `records.set`. Wrap the await in `try`/`catch`: on error call `records.delete(key)` and throw again.
```
