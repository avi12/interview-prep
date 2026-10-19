---
title: Retries, timeouts and backoff
lang: ts
minutes: 25
level: junior
roles: [backend, ai]
files: [retry.ts]
sources:
  - https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter
  - https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
  - https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
  - https://sre.google/sre-book/handling-overload/
  - https://sre.google/sre-book/addressing-cascading-failures/
  - https://stripe.com/blog/idempotency
  - https://martinfowler.com/bliki/CircuitBreaker.html
  - https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker
---

## The retry that makes it worse

A service slows down. Clients time out and **retry**. Now it carries the original load plus the retries, so it slows down more. That loop is a **retry storm**.

It multiplies with depth. If every layer tries 3 times, one click becomes 27 calls on the database, three layers down.

- Retry at **one layer**, close to the user
- Lower layers fail fast and answer "do not retry"

```svg Each layer multiplies the attempts below it
<svg viewBox="0 0 640 226" role="img" aria-label="Retries multiply at each layer: 1 request becomes 3, then 9, then 27 attempts on the database" font-family="var(--font-mono)" font-size="13">
<g data-cue="client">
<rect x="10" y="36" width="124" height="60" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="72" y="62.6" font-size="13" fill="var(--fg)" text-anchor="middle">Client</text>
<text x="72" y="78.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">1 request</text>
<text x="72" y="150" font-size="32" fill="var(--fg)" text-anchor="middle" font-weight="700">1</text>
<text x="72" y="172" font-size="12" fill="var(--fg-muted)" text-anchor="middle">attempts here</text>
</g>
<g data-cue="api">
<path d="M134 66 L166 66" fill="none" stroke="var(--danger)" stroke-width="2"/>
<polygon points="166,66 156,71 156,61" fill="var(--danger)"/>
<text x="150" y="56" font-size="12" fill="var(--fg)" text-anchor="middle" font-weight="700">x3</text>
<rect x="166" y="36" width="124" height="60" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="228" y="62.6" font-size="13" fill="var(--fg)" text-anchor="middle">API</text>
<text x="228" y="78.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">tries 3 times</text>
<text x="228" y="150" font-size="32" fill="var(--fg)" text-anchor="middle" font-weight="700">3</text>
<text x="228" y="172" font-size="12" fill="var(--fg-muted)" text-anchor="middle">attempts here</text>
</g>
<g data-cue="orders">
<path d="M290 66 L322 66" fill="none" stroke="var(--danger)" stroke-width="2"/>
<polygon points="322,66 312,71 312,61" fill="var(--danger)"/>
<text x="306" y="56" font-size="12" fill="var(--fg)" text-anchor="middle" font-weight="700">x3</text>
<rect x="322" y="36" width="124" height="60" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="384" y="62.6" font-size="13" fill="var(--fg)" text-anchor="middle">Orders</text>
<text x="384" y="78.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">tries 3 times</text>
<text x="384" y="150" font-size="32" fill="var(--fg)" text-anchor="middle" font-weight="700">9</text>
<text x="384" y="172" font-size="12" fill="var(--fg-muted)" text-anchor="middle">attempts here</text>
</g>
<g data-cue="db">
<path d="M446 66 L478 66" fill="none" stroke="var(--danger)" stroke-width="2"/>
<polygon points="478,66 468,71 468,61" fill="var(--danger)"/>
<text x="462" y="56" font-size="12" fill="var(--fg)" text-anchor="middle" font-weight="700">x3</text>
<rect x="478" y="36" width="124" height="60" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
<text x="540" y="62.6" font-size="13" fill="var(--fg)" text-anchor="middle">Database</text>
<text x="540" y="78.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">takes the hit</text>
<text x="540" y="150" font-size="32" fill="var(--danger)" text-anchor="middle" font-weight="700">27</text>
<text x="540" y="172" font-size="12" fill="var(--fg-muted)" text-anchor="middle">attempts here</text>
</g>
<text x="10" y="212" font-size="12" fill="var(--fg-muted)" text-anchor="start">The same maths at 3 tries on 5 layers: 3 x 3 x 3 x 3 x 3 = 243.</text>
</svg>
```

```narrate
Start with one request. [[client]] A client sends a single request. [[api]] The A P I tries up to three times, so three calls go down. [[orders]] The orders service also tries three times for each of those, so nine calls arrive. [[db]] By the database it is twenty seven, and the database is the one that is already struggling.
```

> **Why:** retries are selfish. They spend the server's time to raise your own chance of success. Under overload they keep the load high and delay recovery.

> **Not this:** retries at every layer. Each layer's patience multiplies with the others. AWS gives 3 tries on 5 layers as 243 times the load.

## Timeouts come first

Every remote call needs a **timeout**. With none, one slow dependency ties up every thread you own.

- Too high: threads wait, queues fill
- Too low: healthy calls fail and cause more retries

AWS picks one like this: choose an acceptable false-timeout rate, such as 0.1 percent, then use the dependency's matching latency, its **p99.9**, plus a little padding.

Then pass the **remaining time** down. Google SRE calls this deadline propagation.

```svg The deadline shrinks as it travels, so deep calls stop when nobody is waiting any more
<svg viewBox="0 0 640 206" role="img" aria-label="A 30 second deadline shrinks as it is passed down: 23 seconds for B, then 19 seconds for C" font-family="var(--font-mono)" font-size="13">
<path d="M130 20 L130 176" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<text x="130" y="194" font-size="12" fill="var(--fg-muted)" text-anchor="middle">0 s</text>
<path d="M290 20 L290 176" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<text x="290" y="194" font-size="12" fill="var(--fg-muted)" text-anchor="middle">10 s</text>
<path d="M450 20 L450 176" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<text x="450" y="194" font-size="12" fill="var(--fg-muted)" text-anchor="middle">20 s</text>
<path d="M610 20 L610 176" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<text x="610" y="194" font-size="12" fill="var(--fg-muted)" text-anchor="middle">30 s</text>
<g data-cue="a">
<text x="10" y="50" font-size="13" fill="var(--fg)" text-anchor="start">Server A</text>
<rect x="130" y="28" width="112" height="32" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="186" y="49" font-size="11" fill="var(--fg-muted)" text-anchor="middle">7 s own work</text>
<rect x="242" y="28" width="368" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="426" y="49" font-size="12" fill="var(--fg)" text-anchor="middle">calls B with 23 s left</text>
</g>
<g data-cue="b">
<text x="10" y="102" font-size="13" fill="var(--fg)" text-anchor="start">Server B</text>
<rect x="242" y="80" width="64" height="32" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="274" y="101" font-size="11" fill="var(--fg-muted)" text-anchor="middle">4 s work</text>
<rect x="306" y="80" width="304" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="458" y="101" font-size="12" fill="var(--fg)" text-anchor="middle">calls C with 19 s left</text>
</g>
<g data-cue="c">
<text x="10" y="154" font-size="13" fill="var(--fg)" text-anchor="start">Server C</text>
<rect x="306" y="132" width="304" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="458" y="153" font-size="12" fill="var(--fg)" text-anchor="middle">has 19 s</text>
</g>
</svg>
```

```narrate
Server A has thirty seconds. [[a]] It spends seven on its own work, then calls B and says: you have twenty three left. [[b]] B spends four seconds, then calls C with nineteen left. [[c]] C knows its real deadline, so it can give up on work that nobody is waiting for anymore.
```

> **Not this:** no timeout, or one big default of 30 seconds everywhere. The first hangs forever. The second hangs for 30 seconds.

```quiz
q: A dependency's p99.9 latency is 80 ms. Which timeout is sensible?
options:
  - 10 ms
  - About 100 ms
  - 30 seconds
answer: 1
why: A little above p99.9 lets about 99.9 percent of healthy calls finish. 10 ms would fail healthy calls and trigger retries. 30 seconds ties up threads.
```

## Backoff and jitter

Between retries, wait. **Exponential backoff** doubles the wait: 100 ms, 200, 400, up to a cap. But clients that failed together **retry together**. **Jitter** adds randomness. AWS SDKs use full jitter:

```text
delay = random(0, 1) x min(cap, base x 2^retry)
```

In AWS's simulation, backoff without jitter was the worst on both total work and completion time.

```svg Without jitter the retries arrive in waves. With jitter they arrive as a trickle
<svg viewBox="0 0 640 224" role="img" aria-label="Without jitter, failed clients return in synchronized spikes. With full jitter, retries spread out" font-family="var(--font-mono)" font-size="13">
<g data-cue="synced">
<text x="20" y="28" font-size="13" fill="var(--fg)" text-anchor="start" font-weight="700">NO JITTER</text>
<path d="M20 170 L284 170" fill="none" stroke="var(--border)" stroke-width="2"/>
<rect x="26" y="70" width="24" height="100" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<rect x="58" y="70" width="24" height="100" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<rect x="122" y="70" width="24" height="100" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<rect x="250" y="70" width="24" height="100" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="20" y="190" font-size="11" fill="var(--fg-muted)" text-anchor="start">time</text>
<text x="20" y="210" font-size="12" fill="var(--fg)" text-anchor="start">everyone comes back together</text>
</g>
<g data-cue="jitter">
<text x="340" y="28" font-size="13" fill="var(--fg)" text-anchor="start" font-weight="700">FULL JITTER</text>
<path d="M340 170 L604 170" fill="none" stroke="var(--border)" stroke-width="2"/>
<rect x="346" y="70" width="24" height="100" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="378" y="146" width="24" height="24" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="410" y="142" width="24" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="442" y="148" width="24" height="22" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="474" y="144" width="24" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="506" y="150" width="24" height="20" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="538" y="146" width="24" height="24" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="570" y="148" width="24" height="22" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="340" y="190" font-size="11" fill="var(--fg-muted)" text-anchor="start">time</text>
<text x="340" y="210" font-size="12" fill="var(--fg)" text-anchor="start">retries are spread out</text>
</g>
</svg>
```

```narrate
Look at the left chart. [[synced]] Without jitter, all the clients that failed together wait the same time, so they come back together, in spikes that hit the server again and again. [[jitter]] On the right, every client picks a random wait between zero and its limit. The same retries now arrive as a gentle trickle that the server can survive.
```

> **Why:** jitter turns synchronized spikes into a steady trickle.

> **Not this:** a fixed delay. Everyone who failed together retries at the same moment, forever.

## Retry only what is safe

A retry runs the request **again**. Is that safe?

- Reads (`GET`): yes
- Set-a-value calls (`PUT`, `DELETE`): yes, same result
- Create or charge (`POST`): **no**, unless it carries an **idempotency key**

The client makes one unique key per operation and re-sends it on every retry. The server saves the result per key and replies with the saved result.

Retry only **transient** errors: timeouts, 503, 429 (obey `Retry-After`). Never 400, 401 or 404.

```svg The retry carries the same key, so the server returns the saved result
<svg viewBox="0 0 640 332" role="img" aria-label="The response is lost, the client retries with the same key, and the server returns the saved result instead of charging twice" font-family="var(--font-mono)" font-size="13">
<path d="M66 38 L66 326" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="6" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="66" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Client</text>
<path d="M574 38 L574 326" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="514" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="574" y="16.6" font-size="13" fill="var(--fg)" text-anchor="middle">Server</text>
<text x="574" y="32.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">saves by key</text>
<g data-cue="first">
<path d="M68 79.4 L572 79.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="572,79.4 562,84.4 562,74.4" fill="var(--fg)"/>
<text x="320" y="72.4" font-size="12" fill="var(--fg)" text-anchor="middle">POST /charges, key abc</text>
</g>
<g data-cue="first">
<path d="M574 99.4 L536 99.4 L536 117.4 L572 117.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="572,117.4 562,122.4 562,112.4" fill="var(--fg)"/>
<text x="528" y="104.4" font-size="12" fill="var(--fg)" text-anchor="end">charge made</text>
</g>
<g data-cue="lost">
<path d="M572 155.4 L68 155.4" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="68,155.4 78,150.4 78,160.4" fill="var(--danger)"/>
<text x="320" y="148.4" font-size="12" fill="var(--fg)" text-anchor="middle">response lost</text>
</g>
<g data-cue="retry">
<path d="M66 175.4 L104 175.4 L104 193.4 L68 193.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="68,193.4 78,188.4 78,198.4" fill="var(--fg)"/>
<text x="112" y="180.4" font-size="12" fill="var(--fg)" text-anchor="start">timeout, so retry</text>
</g>
<g data-cue="retry">
<path d="M68 231.4 L572 231.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="572,231.4 562,236.4 562,226.4" fill="var(--fg)"/>
<text x="320" y="224.4" font-size="12" fill="var(--fg)" text-anchor="middle">POST /charges, key abc</text>
</g>
<g data-cue="dedupe">
<path d="M574 251.4 L536 251.4 L536 269.4 L572 269.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="572,269.4 562,274.4 562,264.4" fill="var(--fg)"/>
<text x="528" y="256.4" font-size="12" fill="var(--fg)" text-anchor="end">key seen: reuse result</text>
</g>
<g data-cue="dedupe">
<path d="M572 307.4 L68 307.4" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="68,307.4 78,302.4 78,312.4" fill="var(--ok)"/>
<text x="320" y="300.4" font-size="12" fill="var(--fg)" text-anchor="middle">200 same result</text>
</g>
</svg>
```

```narrate
Follow the money. [[first]] The client posts a charge with a unique key, and the server makes the charge. [[lost]] But the response is lost on the way back. [[retry]] The client sees only a timeout, so it retries with the same key. [[dedupe]] The server recognizes the key and returns the saved result. The customer is charged once.
```

> **Trap:** retrying a `POST` charge with no key. If the first try worked and only the response was lost, the customer pays twice.

```quiz
q: A POST /charges call times out and the client retries. What makes this safe?
options:
  - A longer timeout
  - The same idempotency key on every attempt
  - Retrying immediately
answer: 1
why: The key lets the server spot the repeat and return the first result instead of charging again.
```

## Circuit breaker and retry budget

A **circuit breaker** stops calls to a dependency that is clearly down. Closed: calls go through. After enough failures it **opens**: calls fail instantly. After a cool-down it goes **half-open** and lets a few trial calls through.

It protects the caller (no threads wasted waiting) and the sick service (no new load).

A **retry budget** is simpler. Google SRE: at most 3 attempts per request, and retries under 10 percent of a client's requests. That caps the extra load near 1.1 times instead of 3 times.

```svg The breaker opens on failures and tests the water before closing again
<svg viewBox="0 0 640 250" role="img" aria-label="Circuit breaker states: closed, open and half-open, and what moves it between them" font-family="var(--font-mono)" font-size="13">
<g data-cue="closed">
<rect x="30" y="40" width="170" height="64" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="115" y="68.6" font-size="13" fill="var(--fg)" text-anchor="middle">CLOSED</text>
<text x="115" y="84.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">calls go through</text>
</g>
<g data-cue="trip">
<path d="M200 72 L440 72" fill="none" stroke="var(--danger)" stroke-width="2"/>
<polygon points="440,72 430,77 430,67" fill="var(--danger)"/>
<text x="320" y="62" font-size="12" fill="var(--fg)" text-anchor="middle">failures reach the threshold</text>
</g>
<g data-cue="open">
<rect x="440" y="40" width="170" height="64" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
<text x="525" y="68.6" font-size="13" fill="var(--fg)" text-anchor="middle">OPEN</text>
<text x="525" y="84.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">fail fast, no calls</text>
</g>
<g data-cue="half">
<path d="M490 104 L390 172" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="390,172 395.5,162.2 401.1,170.5" fill="var(--fg)"/>
<text x="424" y="140" font-size="12" fill="var(--fg)" text-anchor="end">after a cool-down</text>
<rect x="235" y="172" width="170" height="64" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="200.6" font-size="13" fill="var(--fg)" text-anchor="middle">HALF-OPEN</text>
<text x="320" y="216.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">a few trial calls</text>
</g>
<g data-cue="recover">
<path d="M235 204 L115 204 L115 106" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="115,106 120,116 110,116" fill="var(--ok)"/>
<text x="122" y="160" font-size="12" fill="var(--fg)" text-anchor="start">trial works</text>
<path d="M405 204 L545 204 L545 106" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="545,106 550,116 540,116" fill="var(--danger)"/>
<text x="553" y="160" font-size="12" fill="var(--fg)" text-anchor="start">trial fails</text>
</g>
</svg>
```

```narrate
Read the three states. [[closed]] Normally the breaker is closed and calls go through. [[trip]] When failures reach a threshold, [[open]] it opens, and calls fail instantly without touching the sick service. [[half]] After a cool-down it goes half open and lets a few trial calls through. [[recover]] If the trial works, it closes. If it fails, it opens again.
```

> **Not this:** a breaker as your only protection. AWS warns it adds a second mode of behavior that is hard to test. A retry budget often does the job with less.

## Your turn

Open `retry.ts` and implement two functions.

- `backoffDelayMs({ retryIndex, baseDelayMs, maxDelayMs, random })` is **full jitter**: `random()` times `min(maxDelayMs, baseDelayMs * 2 ** retryIndex)`
- `retry({ operation, isRetryable, maxAttempts, baseDelayMs, maxDelayMs, sleep, random })` calls `operation(attempt)`, with `attempt` from 0
- On an error: throw it if this was the last attempt or `isRetryable` says no. Otherwise `await sleep(...)` and try again
- No sleep after the last attempt

`sleep` and `random` are injected, so tests run instantly and repeat exactly.

Run the tests from the Run button, or `pnpm lesson test systemdesign/05-retries-timeouts-backoff`.

```hint
Start with `backoffDelayMs`. It is one line: the random fraction times the capped ceiling.
```

```hint
In `retry`, loop with `for (let attempt = 0; ; attempt++)`. Put `return await operation(attempt)` inside a `try`, and do the retry decision in the `catch`.
```

```hint
In the `catch`: compute `isLastAttempt = attempt + 1 >= maxAttempts`. If it is the last attempt or the error is not retryable, `throw error`. Otherwise `await sleep(backoffDelayMs({ retryIndex: attempt, ... }))` and let the loop continue.
```
