---
title: Rate limiter
lang: ts
minutes: 25
level: junior
roles: [backend]
files: [rateLimiter.ts]
sources:
  - https://stripe.com/blog/rate-limiters
  - https://blog.cloudflare.com/counting-things-a-lot-of-different-things/
  - https://www.hellointerview.com/learn/system-design/problem-breakdowns/distributed-rate-limiter
  - https://redis.io/docs/latest/commands/incr/
  - https://en.wikipedia.org/wiki/Token_bucket
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429
---

## Why limit, and where

A rate limiter says: **no more than N requests per client per time window**. It stops one noisy client from hurting everyone, and survives bugs like a retry loop.

- Count by a **key**: user id, API key or IP
- Put it at the **gateway**, before the app servers
- Answer with HTTP `429` and a `Retry-After` header

Stripe calls the per-user request limiter "by far the most important one".

```svg The limiter sits at the gateway. Counters live in a shared store, rejected requests never reach the app
<svg viewBox="0 0 640 226" role="img" aria-label="A rate limiter at the gateway: allowed requests pass, others get 429, counters live in Redis" font-family="var(--font-mono)" font-size="13">
<g data-cue="client">
<rect x="10" y="74" width="92" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="56" y="103.6" font-size="13" fill="var(--fg)" text-anchor="middle">Client</text>
</g>
<g data-cue="gateway">
<path d="M102 99 L170 99" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="170,99 160,104 160,94" fill="var(--fg)"/>
<rect x="170" y="52" width="150" height="94" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="245" y="95.6" font-size="13" fill="var(--fg)" text-anchor="middle">API gateway</text>
<text x="245" y="111.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">rate limiter</text>
</g>
<g data-cue="store">
<path d="M245 146 L245 176" fill="none" stroke="var(--fg-muted)" stroke-width="2"/>
<polygon points="245,176 240,166 250,166" fill="var(--fg-muted)"/>
<text x="255" y="166" font-size="12" fill="var(--fg-muted)" text-anchor="start">tokens?</text>
<rect x="170" y="176" width="150" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="245" y="200.6" font-size="13" fill="var(--fg)" text-anchor="middle">Redis counters</text>
</g>
<g data-cue="allowed">
<path d="M320 99 L410 99" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="410,99 400,104 400,94" fill="var(--ok)"/>
<text x="365" y="90" font-size="12" fill="var(--fg)" text-anchor="middle">allowed</text>
<rect x="410" y="74" width="130" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="475" y="103.6" font-size="13" fill="var(--fg)" text-anchor="middle">App servers</text>
</g>
<g data-cue="reject">
<path d="M245 52 L245 18 L56 18 L56 74" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="56,74 51,64 61,64" fill="var(--danger)"/>
<text x="150" y="12" font-size="12" fill="var(--fg)" text-anchor="middle">429 + Retry-After</text>
</g>
</svg>
```

```narrate
Start with the client on the left. [[client]] Every request first meets [[gateway]] the gateway, which runs the rate limiter. [[store]] It asks a shared store, here Redis, whether this client still has budget. [[allowed]] If yes, the request goes on to the app servers. [[reject]] If not, the gateway answers right away with a four twenty nine and a retry after header.
```

> **Why:** reject early. A request refused at the gateway costs almost nothing. One that reaches the app and then fails costs a full request.

> **Not this:** a counter inside each app server. With ten servers, each sees a tenth of a client's traffic, so the real limit is ten times too high.

## Fixed window: simple, with a hole

Count requests per clock window, for example per minute. One counter per client. When the minute changes, the counter resets. In Redis this is `INCR` plus `EXPIRE`.

The hole: a client sends 10 requests at second 59 and 10 more at second 60. Each window sees only 10, yet **20 landed in two seconds**.

```svg The window boundary hides a double burst
<svg viewBox="0 0 640 236" role="img" aria-label="Fixed window boundary burst: 10 requests at the end of one minute and 10 at the start of the next" font-family="var(--font-mono)" font-size="13">
<g data-cue="windows">
<rect x="20" y="34" width="300" height="112" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<rect x="320" y="34" width="300" height="112" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="30" y="54" font-size="12" fill="var(--fg-muted)" text-anchor="start">WINDOW 1 (0-60 s)</text>
<text x="330" y="54" font-size="12" fill="var(--fg-muted)" text-anchor="start">WINDOW 2 (60-120 s)</text>
<text x="30" y="134" font-size="12" fill="var(--fg)" text-anchor="start">count 10 of 10: ok</text>
<text x="330" y="134" font-size="12" fill="var(--fg)" text-anchor="start">count 10 of 10: ok</text>
</g>
<g data-cue="late">
<rect x="232" y="68" width="88" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="276" y="86.2" font-size="12" fill="var(--fg)" text-anchor="middle">10 requests</text>
<text x="276" y="102.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">at 59 s</text>
</g>
<g data-cue="early">
<rect x="320" y="68" width="88" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="364" y="86.2" font-size="12" fill="var(--fg)" text-anchor="middle">10 requests</text>
<text x="364" y="102.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">at 60 s</text>
</g>
<g data-cue="verdict">
<path d="M232 162 L408 162" fill="none" stroke="var(--danger)" stroke-width="2"/>
<path d="M232 156 L232 168" fill="none" stroke="var(--danger)" stroke-width="2"/>
<path d="M408 156 L408 168" fill="none" stroke="var(--danger)" stroke-width="2"/>
<text x="320" y="190" font-size="14" fill="var(--fg)" text-anchor="middle" font-weight="700">20 requests in 2 seconds</text>
<text x="320" y="212" font-size="12" fill="var(--fg-muted)" text-anchor="middle">The limit says 10 per minute. Neither window noticed.</text>
</g>
</svg>
```

```narrate
Look at the two windows. [[windows]] Each window allows ten requests per minute. [[late]] A client sends ten requests in the last second of the first window. [[early]] Then ten more in the first second of the next one. [[verdict]] Both windows count exactly ten, so both say fine. But the service just received twenty requests in two seconds, double the limit.
```

> **Why:** fixed window is the cheapest design: one number per client. For rough protection, that can be enough.

```quiz
q: A fixed window limit is 100 per minute. In the worst case, how many requests can arrive within 2 seconds?
options:
  - 100
  - 200
  - 50
answer: 1
why: 100 at the very end of one window plus 100 at the very start of the next. Each window still counts only 100.
```

## Sliding window: close the hole

Instead of clock windows, look at the **last 60 seconds from now**. Two ways:

| Variant | Stores | Accuracy |
|---|---|---|
| Sliding log | A timestamp per request | Exact, but memory grows with the limit |
| Sliding counter | Two counters per client | Close: assumes even traffic in the old window |

Cloudflare uses the counter. On 400 million requests it was wrong for 0.003 percent of them.

```svg The old window counts only for the part that still overlaps the last 60 seconds
<svg viewBox="0 0 640 236" role="img" aria-label="Sliding window counter: weigh the previous minute by how much of it is still inside the last 60 seconds" font-family="var(--font-mono)" font-size="13">
<g data-cue="previous">
<rect x="20" y="46" width="300" height="60" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="170" y="72" font-size="12" fill="var(--fg-muted)" text-anchor="middle">previous minute</text>
<text x="170" y="94" font-size="14" fill="var(--fg)" text-anchor="middle">42 requests</text>
</g>
<g data-cue="current">
<rect x="320" y="46" width="300" height="60" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="470" y="72" font-size="12" fill="var(--fg-muted)" text-anchor="middle">current minute</text>
<text x="470" y="94" font-size="14" fill="var(--fg)" text-anchor="middle">18 requests</text>
</g>
<g data-cue="slide">
<rect x="95" y="36" width="300" height="80" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4"/>
<path d="M395 28 L395 124" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
<text x="395" y="22" font-size="12" fill="var(--fg)" text-anchor="middle">now: 15 s into the minute</text>
<text x="245" y="136" font-size="12" fill="var(--fg-muted)" text-anchor="middle">last 60 seconds</text>
<text x="207" y="156" font-size="12" fill="var(--fg-muted)" text-anchor="middle">45 s of the old minute</text>
</g>
<g data-cue="result">
<text x="20" y="196" font-size="16" fill="var(--fg)" text-anchor="start" font-weight="700">rate = 42 x 45/60 + 18 = 49.5</text>
<text x="20" y="220" font-size="12" fill="var(--fg-muted)" text-anchor="start">Limit 50: this request is still allowed. Two numbers per client.</text>
</g>
</svg>
```

```narrate
The counter version needs just two numbers. [[previous]] The previous minute saw forty two requests. [[current]] The current minute has seen eighteen so far. [[slide]] We are fifteen seconds in, so the last sixty seconds still include forty five seconds of the old minute, three quarters of it. [[result]] Forty two times three quarters, plus eighteen, is forty nine and a half. Under fifty, so allow.
```

> **Not this:** the sliding log for big limits. A limit of 5,000 per hour means up to 5,000 timestamps stored for every single client.

## Token bucket: allow bursts, cap the average

A bucket holds up to **b tokens**. Tokens drip in at **r per second**. Each request takes one. No token, no entry. Bursts up to `b` pass. The long-run average cannot exceed `r`.

Do not run a timer per client. Store two numbers, `tokens` and `lastRefillTime`, and refill **when a request arrives**:

```ts
const tokens = Math.min(capacity, previousTokens + elapsedSeconds * refillPerSecond);
```

| Algorithm | Memory | Bursts | Used by |
|---|---|---|---|
| Fixed window | 1 number | Double burst at the edge | Quick and rough |
| Sliding log | N timestamps | None | Small, exact limits |
| Sliding counter | 2 numbers | Smoothed | Cloudflare |
| Token bucket | 2 numbers | Allowed up to `b` | Stripe |

```svg The bucket refills at a steady rate. Requests spend tokens, and an empty bucket says no
<svg viewBox="0 0 640 236" role="img" aria-label="Token bucket: tokens drip in at a fixed rate, each request takes one, an empty bucket rejects" font-family="var(--font-mono)" font-size="13">
<g data-cue="refill">
<rect x="20" y="60" width="140" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="90" y="83.2" font-size="12" fill="var(--fg)" text-anchor="middle">refill</text>
<text x="90" y="99.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">1 token per second</text>
<path d="M160 87 L230 87" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="230,87 220,92 220,82" fill="var(--ok)"/>
</g>
<g data-cue="bucket">
<rect x="230" y="38" width="180" height="104" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="60" font-size="12" fill="var(--fg-muted)" text-anchor="middle">bucket, capacity 5</text>
<rect x="244" y="80" width="28" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="277" y="80" width="28" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="310" y="80" width="28" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="343" y="80" width="28" height="28" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="376" y="80" width="28" height="28" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<text x="320" y="128" font-size="12" fill="var(--fg)" text-anchor="middle">3 of 5 tokens</text>
</g>
<g data-cue="take">
<rect x="480" y="60" width="140" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="550" y="83.2" font-size="12" fill="var(--fg)" text-anchor="middle">request</text>
<text x="550" y="99.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">needs 1 token</text>
<path d="M480 87 L414 87" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="414,87 424,82 424,92" fill="var(--fg)"/>
</g>
<g data-cue="allow">
<path d="M270 142 L236 178" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="236,178 239.2,167.3 246.5,174.2" fill="var(--ok)"/>
<rect x="90" y="178" width="190" height="46" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="185" y="197.2" font-size="12" fill="var(--fg)" text-anchor="middle">token found</text>
<text x="185" y="213.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">allowed, remove 1</text>
</g>
<g data-cue="reject">
<path d="M370 142 L404 178" fill="none" stroke="var(--danger)" stroke-width="2"/>
<polygon points="404,178 393.5,174.2 400.8,167.3" fill="var(--danger)"/>
<rect x="360" y="178" width="260" height="46" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="490" y="197.2" font-size="12" fill="var(--fg)" text-anchor="middle">bucket empty</text>
<text x="490" y="213.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">429 + Retry-After</text>
</g>
</svg>
```

```narrate
Here is a token bucket. [[refill]] Tokens drip in at a steady rate, one per second here. [[bucket]] The bucket holds at most five, and right now it has three. [[take]] Each request needs one token. [[allow]] If a token is there, the request is allowed and the token is removed. [[reject]] If the bucket is empty, the answer is four twenty nine, with a retry after time.
```

> **Why:** real clients are bursty. A page load fires ten calls at once. A token bucket allows that, and still caps the sustained rate.

> **Not this:** a timer that adds tokens to every bucket. A million clients means a million timers. Compute the refill when the request arrives.

```quiz
q: A bucket has capacity 10 and refills 2 tokens per second. It is full. A client sends 30 requests at once. How many pass?
options:
  - 2
  - 10
  - 30
answer: 1
why: The full bucket holds 10 tokens, so 10 requests pass at once. The other 20 wait for the 2 per second refill.
```

## Many servers, one counter

With ten gateways, the counters must be shared. Redis is the usual home: very fast, keys that expire, atomic commands.

But **read, then write** is not atomic. Two gateways read "1 token left" at the same moment, both allow the request, and both write 0. The last token was spent twice.

```svg Two gateways read the same value, so both spend the last token
<svg viewBox="0 0 640 326" role="img" aria-label="Read then write is not atomic: two gateways both read one token left and both take it" font-family="var(--font-mono)" font-size="13">
<path d="M66 38 L66 320" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="6" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="66" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Gateway A</text>
<path d="M320 38 L320 320" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="260" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="16.6" font-size="13" fill="var(--fg)" text-anchor="middle">Redis</text>
<text x="320" y="32.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">shared counter</text>
<path d="M574 38 L574 320" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="514" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="574" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Gateway B</text>
<g data-cue="reads">
<path d="M68 77.9 L318 77.9" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="318,77.9 308,82.9 308,72.9" fill="var(--fg)"/>
<text x="193" y="70.9" font-size="12" fill="var(--fg)" text-anchor="middle">GET tokens</text>
</g>
<g data-cue="reads">
<path d="M572 113.9 L322 113.9" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="322,113.9 332,108.9 332,118.9" fill="var(--fg)"/>
<text x="447" y="106.9" font-size="12" fill="var(--fg)" text-anchor="middle">GET tokens</text>
</g>
<g data-cue="reads">
<path d="M318 149.9 L68 149.9" fill="none" stroke="var(--fg)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="68,149.9 78,144.9 78,154.9" fill="var(--fg)"/>
<text x="193" y="142.9" font-size="12" fill="var(--fg)" text-anchor="middle">1 left</text>
</g>
<g data-cue="reads">
<path d="M322 185.9 L572 185.9" fill="none" stroke="var(--fg)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="572,185.9 562,190.9 562,180.9" fill="var(--fg)"/>
<text x="447" y="178.9" font-size="12" fill="var(--fg)" text-anchor="middle">1 left</text>
</g>
<g data-cue="writes">
<path d="M68 221.9 L318 221.9" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="318,221.9 308,226.9 308,216.9" fill="var(--fg)"/>
<text x="193" y="214.9" font-size="12" fill="var(--fg)" text-anchor="middle">SET tokens 0</text>
</g>
<g data-cue="writes">
<path d="M572 257.9 L322 257.9" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="322,257.9 332,252.9 332,262.9" fill="var(--fg)"/>
<text x="447" y="250.9" font-size="12" fill="var(--fg)" text-anchor="middle">SET tokens 0</text>
</g>
<g data-cue="broken">
<rect x="46" y="276.5" width="548" height="27" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
<text x="320" y="293.5" font-size="12" fill="var(--fg)" text-anchor="middle">Both took the last token. The limit is broken.</text>
</g>
</svg>
```

```narrate
Watch the race. [[reads]] Gateway A and gateway B both ask Redis for the tokens, and both are told one is left. [[writes]] Each one then writes zero. [[broken]] Both took the last token, so the limit was broken. Nothing crashed. The numbers were just wrong, which is the nastiest kind of bug.
```

> **Trap:** `GET`, compute in your code, `SET`. Any gap between the read and the write lets another server slip in.

## Make it atomic, and decide what failure means

Send the whole decision to Redis as **one script** (a Lua script, or `INCR` for a plain counter). Redis runs one script at a time, so no one can slip in between.

```svg One script at a time: the second caller sees the first caller's result
<svg viewBox="0 0 640 256" role="img" aria-label="One atomic script: Redis runs the read, refill, take and write as a single step, one caller at a time" font-family="var(--font-mono)" font-size="13">
<path d="M66 38 L66 250" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="6" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="66" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Gateway A</text>
<path d="M320 38 L320 250" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="260" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="16.6" font-size="13" fill="var(--fg)" text-anchor="middle">Redis</text>
<text x="320" y="32.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">shared counter</text>
<path d="M574 38 L574 250" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="514" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="574" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Gateway B</text>
<g data-cue="send">
<path d="M68 79.4 L318 79.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="318,79.4 308,84.4 308,74.4" fill="var(--fg)"/>
<text x="193" y="72.4" font-size="12" fill="var(--fg)" text-anchor="middle">run take-token</text>
</g>
<g data-cue="send">
<path d="M572 117.4 L322 117.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="322,117.4 332,112.4 332,122.4" fill="var(--fg)"/>
<text x="447" y="110.4" font-size="12" fill="var(--fg)" text-anchor="middle">run take-token</text>
</g>
<g data-cue="serial">
<path d="M320 137.4 L358 137.4 L358 155.4 L322 155.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="322,155.4 332,150.4 332,160.4" fill="var(--fg)"/>
<text x="366" y="142.4" font-size="12" fill="var(--fg)" text-anchor="start">one script at a time</text>
</g>
<g data-cue="results">
<path d="M318 193.4 L68 193.4" fill="none" stroke="var(--ok)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="68,193.4 78,188.4 78,198.4" fill="var(--ok)"/>
<text x="193" y="186.4" font-size="12" fill="var(--fg)" text-anchor="middle">allowed</text>
</g>
<g data-cue="results">
<path d="M322 231.4 L572 231.4" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="572,231.4 562,236.4 562,226.4" fill="var(--danger)"/>
<text x="447" y="224.4" font-size="12" fill="var(--fg)" text-anchor="middle">denied, 429</text>
</g>
</svg>
```

```narrate
The fix is to send the whole decision to Redis as one script. [[send]] Both gateways send the same take token script. [[serial]] Redis runs scripts strictly one at a time. [[results]] So the first caller gets allowed, and the second sees an empty bucket and gets denied. No gap, no race.
```

| Concern | Answer |
|---|---|
| Read-modify-write race | One atomic script |
| Server clocks disagree | Use one clock: the store's |
| Redis is down | **Fail open**: allow, and alert. Stripe does this |
| One huge client | Shard keys by client id, block abusers at the edge |
| Rollout | Dark launch: log what you would block first |

> **Not this:** fail closed by default. Then a limiter outage takes your whole API down. Fail closed only where abuse costs more than downtime, like payments or login.

## Your turn

Open `rateLimiter.ts` and implement `createRateLimiter({ capacity, refillPerSecond, store, now })`. It returns `{ check(key) }`.

- `check` returns `{ isAllowed, remaining, retryAfterMs }`. A new key starts with a **full** bucket
- Refill lazily and keep fractions of a token. Ignore a clock that moves backwards
- Call `store.update(key, change)` **once** per check. `change(previous)` returns `{ state, decision }`
- If the store throws, **fail open**

Run the tests from the Run button, or `pnpm lesson test systemdesign/03-rate-limiter`.

```hint
Split it up: one small function that refills a state (a missing state means a full bucket), and one that takes a token and builds the `{ state, decision }` pair.
```

```hint
When denied, the wait is the missing part of a token divided by the refill rate: `Math.ceil(((1 - tokens) / refillPerSecond) * 1000)`.
```

```hint
Return the previous state unchanged if `nowMs` is not after `refilledAtMs`. Wrap `store.update` in try and catch, and return an allowed decision from the catch.
```
