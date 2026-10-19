---
title: Async code and time
lang: ts
minutes: 25
level: junior
roles: [backend, ai]
files: [timing.ts]
sources:
  - https://vitest.dev/guide/mocking/timers
  - https://vitest.dev/guide/mocking/dates
  - https://vitest.dev/api/vi
  - https://martinfowler.com/articles/nonDeterminism.html
---

## Why real time ruins tests

Code that waits is hard to test. A test that really waits is:

- **Slow:** a 2-hour timeout cannot be tested at all
- **Flaky:** on a busy machine, a wait that was "long enough" is suddenly too short

Fowler's advice: avoid bare sleeps. They are either too short, or they slow the whole suite. Instead, **take control of time**.

```svg Real time makes the test wait. A fake clock jumps ahead at once
<svg viewBox="0 0 520 170" role="img" aria-label="Real wait versus fake clock jump">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="real">
      <text x="20" y="28" fill="var(--fg-muted)">real timer</text>
      <rect x="20" y="38" width="440" height="30" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="58" fill="var(--fg)">...waiting 3000 ms, then maybe flaky</text>
    </g>
    <g data-cue="fake">
      <text x="20" y="108" fill="var(--fg-muted)">fake clock</text>
      <rect x="20" y="118" width="16" height="30" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="48" y="138" fill="var(--fg)">jump 3000 ms in under 1 ms</text>
    </g>
  </g>
</svg>
```

```narrate
Waiting is the enemy of a fast test suite. [[real]] A test that really waits three seconds is slow, and on a busy machine the wait may be too short, which makes the test flaky. [[fake]] With a fake clock, the test jumps three seconds ahead in less than a millisecond, and it behaves the same every time.
```

> **Why:** tests that finish in milliseconds can run on every save, so people actually run them.

> **Not this:** `await new Promise(r => setTimeout(r, 3000))` inside a test. It guesses how long is long enough.

## Fake timers: you move the clock

`vi.useFakeTimers()` replaces `setTimeout`, `setInterval`, `Date` and similar functions until `vi.useRealTimers()`. It does **not** fake `process.nextTick` or `queueMicrotask`. Always restore in `afterEach`.

A `debounce` runs a callback once, after calls have stopped for `waitMs`.

```ts
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it("calls once, after the quiet period", () => {
  const callback = vi.fn();
  const search = debounce({ callback, waitMs: 300 });

  search();
  search();
  vi.advanceTimersByTime(299);
  expect(callback).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(callback).toHaveBeenCalledTimes(1);
});
```

Note the border: 299 then 1. The edge idea from the boundaries lesson works on time too.

```narrate
Fake timers put you in charge of the clock. Switch them on before each test and restore the real ones afterwards. Then you move time by hand. In this example, two quick calls, two hundred ninety nine milliseconds later nothing has happened, and one more millisecond makes the callback run exactly once. Testing both sides of the border catches the off by one slips.
```

## Async code: advance the async way

A `retry` helper (you write one below) waits between attempts, and each attempt is a promise. A promise continues only when the engine gets a turn. `advanceTimersByTime` moves the clock but gives no turn. **`await vi.advanceTimersByTimeAsync(ms)`** does both.

```svg The timer only exists after attempt 1 failed, so the test must give the promise a turn before it advances
<svg viewBox="0 0 520 190" role="img" aria-label="Retry timeline with a fake clock">
  <g font-family="var(--font-mono)" font-size="13" text-anchor="middle">
    <path d="M40 100 L480 100" stroke="var(--border)" stroke-width="2"/>
    <g data-cue="attempt">
      <circle cx="70" cy="100" r="16" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="70" y="70" fill="var(--fg)">attempt 1</text>
      <text x="70" y="140" fill="var(--fg-muted)">fails, t = 0</text>
    </g>
    <g data-cue="wait">
      <rect x="110" y="88" width="270" height="24" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="245" y="106" fill="var(--fg)">timer: delayMs = 1000</text>
    </g>
    <g data-cue="advance">
      <path d="M110 50 L380 50 M372 43 L380 50 L372 57" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="245" y="38" fill="var(--fg)">await vi.advanceTimersByTimeAsync(1000)</text>
    </g>
    <g data-cue="second">
      <circle cx="420" cy="100" r="16" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="420" y="140" fill="var(--fg-muted)">attempt 2</text>
    </g>
  </g>
</svg>
```

```narrate
Follow the timeline. [[attempt]] The first attempt fails at time zero. [[wait]] Only then does the code start a timer for one thousand milliseconds. [[advance]] The test moves the fake clock forward with the async version of advance, which also lets pending promises run. [[second]] That is when the second attempt happens. A plain synchronous advance would never let the promise continue.
```

> **Trap:** a promise that rejects while no one is listening raises an unhandled rejection. Attach `expect(promise).rejects...` **first**, advance the clock, then `await` it.

## Inject the clock

If you own the code, don't read the clock from inside it. **Pass time in**, with the real clock as the default:

```ts
export function isExpired({ issuedAt, ttlMs, now = Date.now }) {
  return now() - issuedAt >= ttlMs;
}
```

With `issuedAt: 1000` and `ttlMs: 500`, a test passes `now: () => 1499` or `() => 1500`. No fake timers, exact borders. If you cannot change the code, `vi.setSystemTime(date)` fixes `Date` while fake timers are on.

> **Not this:** `Date.now()` buried deep in business logic. It is a hidden input, so tests must patch the whole world.

```quiz
q: Why does isExpired take a now function as a parameter?
options:
  - it makes the code run faster
  - the test controls the time, with no waiting and no patching
  - Date.now is deprecated
answer: 1
why: Time becomes an ordinary input, so a test can choose any moment and check the exact border.
```

```narrate
If you own the code, the cleanest way is to pass the clock in as a parameter, with the real clock as the default. Then a test hands over a function that returns any moment it likes, and checks the exact border without waiting and without patching anything. Hide the clock inside the logic, and every test has to fight it.
```

## Your turn

Open `timing.ts`. It exports two functions to implement.

**`retry({ task, attempts, delayMs })`**
- Calls `task` up to `attempts` times, waiting `delayMs` between tries, not after the last one
- Resolves with the first success
- Rejects with the **last** error when all attempts fail
- Rejects with `RangeError` if `attempts` is below 1

**`isExpired({ issuedAt, ttlMs, now })`** (`ttl` means time to live)
- True once `ttlMs` or more has passed, so exactly `ttlMs` counts. `now` defaults to `Date.now`

Run `pnpm lesson test testing/05-async-and-time`. The tests use fake timers and an injected clock.

```hint
`retry` is a loop over attempts. Use `try`, `catch`, and a small `sleep` helper built on `setTimeout`.
```

```hint
Remember the last error in a variable, and only sleep when there is another attempt left.
```

```hint
`isExpired` is one line: `now() - issuedAt >= ttlMs`, with `now = Date.now` as a default parameter.
```
