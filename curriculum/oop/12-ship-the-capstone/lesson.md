---
title: Ship the capstone
lang: ts
minutes: 55
level: mid
roles: [backend, ai]
files: [discounts.ts, order.ts, events.ts, checkout.ts, index.ts]
sources:
  - https://martinfowler.com/bliki/PublishedInterface.html
  - https://martinfowler.com/bliki/ValueObject.html
  - https://martinfowler.com/eaaDev/DomainEvent.html
  - https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes
  - https://adr.github.io/
  - https://git-scm.com/docs/git-init
---

## From exercises to a package

You have written the pieces: a `Money` value object, discount rules, an injected payment gateway, an order state machine, domain events. Ten loose files are still not a project.

The problem is the boundary. If other code can `import { totalDiscount } from "checkout/discounts"`, you cannot change `discounts.ts` without breaking it.

The fix is a package: private parts behind **one public file**, `index.ts`. Anything outside plugs in through three doors: the gateway you inject, the rules you pass in, the listeners you subscribe.

```svg The public file is the only door in. Gateway, rules and listeners plug in from outside
<svg viewBox="0 0 520 260" role="img" aria-label="Public index file over private parts, with a gateway and listeners plugging in">
  <g font-family="var(--font-mono)" font-size="11" text-anchor="middle">
    <g data-cue="api">
      <rect x="40" y="8" width="440" height="52" fill="var(--primary-container)" stroke="var(--primary)" stroke-width="2"/>
      <text x="260" y="29" fill="var(--fg)" font-size="14">index.ts: the public API</text>
      <text x="260" y="48" fill="var(--fg-muted)" font-size="10">createCheckout, Money, percentOff, bulkDiscount, CheckoutError</text>
      <path d="M260 60 L260 96 M254 88 L260 98 L266 88" fill="none" stroke="var(--primary)" stroke-width="2"/>
    </g>
    <g data-cue="pieces">
      <rect x="10" y="98" width="500" height="92" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="22" y="114" text-anchor="start" fill="var(--fg-muted)" font-size="10">private: callers cannot import these</text>
      <rect x="20" y="124" width="88" height="46" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="64" y="152" fill="var(--fg)">Money</text>
      <rect x="116" y="124" width="88" height="46" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="160" y="152" fill="var(--fg)">discounts</text>
      <rect x="212" y="124" width="88" height="46" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="256" y="152" fill="var(--fg)">order table</text>
      <rect x="308" y="124" width="88" height="46" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="352" y="152" fill="var(--fg)">events</text>
      <rect x="404" y="124" width="96" height="46" fill="var(--surface-3)" stroke="var(--primary)" stroke-width="2"/>
      <text x="452" y="152" fill="var(--fg)">checkout</text>
    </g>
    <g data-cue="outside">
      <rect x="20" y="212" width="190" height="38" fill="var(--surface-3)" stroke="var(--ok)" stroke-width="2"/>
      <text x="115" y="235" fill="var(--fg)">your PaymentGateway</text>
      <path d="M115 212 L115 194 M109 202 L115 192 L121 202" fill="none" stroke="var(--ok)" stroke-width="2"/>
      <rect x="230" y="212" width="160" height="38" fill="var(--surface-3)" stroke="var(--ok)" stroke-width="2"/>
      <text x="310" y="235" fill="var(--fg)">your listeners</text>
      <path d="M310 212 L310 194 M304 202 L310 192 L316 202" fill="none" stroke="var(--ok)" stroke-width="2"/>
    </g>
  </g>
</svg>
```

```narrate
[[api]] At the top is one public file. It exports only the few names a user needs. [[pieces]] Below it, inside a dashed boundary, are the private parts: money, discounts, the order table, events and the checkout itself. Callers cannot import them. [[outside]] And from the outside, you plug in your own payment gateway and your own listeners. That is the whole shape of the package.
```

> **Why:** Martin Fowler: what matters is "published" versus "public". Once someone outside depends on a name, you cannot rename it freely.

## Keep the public API small

Every exported name is a promise. Export what a user needs, and nothing else.

| Public | Private |
|---|---|
| `createCheckout` | `createEventBus` |
| `Money` | `transitionFor` |
| `percentOff`, `bulkDiscount` | `subtotalOf`, `totalDiscount` |
| `CheckoutError` | the transition table |
| types such as `DiscountRule`, `PaymentGateway` | how orders are stored |

The users' extension points are **types**: write your own `DiscountRule`, `PaymentGateway` or listener, and `createCheckout` accepts it.

> **Not this:** `export * from` every file. It publishes every helper by accident, and the first user who imports one freezes it.

```quiz
q: A teammate wants to import subtotalOf from checkout/discounts for a report. What is the best answer?
options:
  - fine, it is exported, so it is public
  - not through the package: add it to the public API on purpose, or compute it from the order view
  - copy the whole file into the report
answer: 1
why: Deep imports turn private helpers into promises by accident. Make a deliberate decision to publish it, or use what the API already returns.
```

```narrate
Every exported name is a promise, so export only what users need. The factory, the money type, the two built in discount rules and the error class. Helpers like the event bus and the transition function stay private. Users extend the package by writing their own rule, gateway or listener that matches an exported type. Never re export every file.
```

## Decisions you can defend

Each of these cost one line of code and answers an interviewer question.

| Decision | Because |
|---|---|
| status changes **after** the gateway succeeds | a crash in between leaves an unpaid order, not a paid-for-nothing one |
| a busy lock per order | two simultaneous `pay` calls would charge twice |
| listener errors are reported, never thrown | an email bug must not undo a payment |
| a refund failure keeps the order `paid` | the money did not move, so say so |
| gateway, rules, `newId` injected | tests use fakes and new providers need no edit |

```svg pay(orderId): four steps, and what happens when each one goes wrong
<svg viewBox="0 0 520 200" role="img" aria-label="The four steps of pay and the failure branches">
  <g font-family="var(--font-mono)" font-size="11" text-anchor="middle">
    <g data-cue="check">
      <rect x="10" y="14" width="110" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="65" y="35" fill="var(--fg)">1 check</text>
      <text x="65" y="52" fill="var(--fg-muted)">transition table</text>
      <text x="65" y="92" fill="var(--danger)" font-size="10">illegal or busy:</text>
      <text x="65" y="106" fill="var(--danger)" font-size="10">invalid-transition</text>
    </g>
    <g data-cue="charge">
      <path d="M120 39 L138 39" stroke="var(--primary)" stroke-width="2"/>
      <rect x="140" y="14" width="110" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="195" y="35" fill="var(--fg)">2 charge</text>
      <text x="195" y="52" fill="var(--fg-muted)">gateway (injected)</text>
      <text x="195" y="92" fill="var(--danger)" font-size="10">declined: stay placed</text>
      <text x="195" y="106" fill="var(--danger)" font-size="10">throws: unlock, rethrow</text>
    </g>
    <g data-cue="change">
      <path d="M250 39 L268 39" stroke="var(--primary)" stroke-width="2"/>
      <rect x="270" y="14" width="110" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="325" y="35" fill="var(--fg)">3 status</text>
      <text x="325" y="52" fill="var(--fg-muted)">becomes paid</text>
      <text x="325" y="92" fill="var(--fg-muted)" font-size="10">only after the</text>
      <text x="325" y="106" fill="var(--fg-muted)" font-size="10">charge succeeded</text>
    </g>
    <g data-cue="announce">
      <path d="M380 39 L398 39" stroke="var(--primary)" stroke-width="2"/>
      <rect x="400" y="14" width="110" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="455" y="35" fill="var(--fg)">4 announce</text>
      <text x="455" y="52" fill="var(--fg-muted)">OrderPaid</text>
      <text x="455" y="92" fill="var(--fg-muted)" font-size="10">a failing listener</text>
      <text x="455" y="106" fill="var(--fg-muted)" font-size="10">is only reported</text>
    </g>
  </g>
</svg>
```

```narrate
Here is what happens inside pay. [[check]] First, check the transition table and the lock. An illegal move or a second simultaneous call is refused. [[charge]] Second, call the injected gateway. If it declines, the order stays placed. If it throws, the lock is released and the error goes up. [[change]] Third, and only after success, change the status to paid. [[announce]] Fourth, announce the event. A failing listener is reported, never thrown.
```

> **Why:** these decisions are your README paragraph two, and your best interview answers.

## Put it in a git repo

A clean repo is part of the experience. Plain checklist:

- A folder `checkout/` with `src/`, `test/`, `package.json`, `README.md`, `.gitignore`
- `package.json` has `"type": "module"` and a `test` script that runs your tests
- `.gitignore` lists `node_modules`. No secrets, no personal paths
- Tests pass **before every commit**
- One logical change per commit, message says what and why

```sh
git init -b main
git add package.json .gitignore && git commit -m "chore: scaffold the package"
git add src/money.ts && git commit -m "feat: add the Money value object"
git add src/discounts.ts && git commit -m "feat: add discount rules"
git add src/order.ts && git commit -m "feat: add the order transition table"
git add src/events.ts && git commit -m "feat: add domain events"
git add src/checkout.ts src/index.ts && git commit -m "feat: add checkout and its public API"
git add README.md && git commit -m "docs: explain design decisions"
```

`git init -b main` names the first branch. Push to an empty GitHub repository and pin it.

```narrate
Put the work in a clean repository. A folder with source, tests, a package file, a readme and a git ignore file. Run the tests before every commit. Make one logical change per commit, with a message that says what and why, so someone reading the history can follow your build. Start the repository with the branch named main, then push it to an empty GitHub repository.
```

> **Not this:** one commit named "final" with everything, or a repo with no tests. A reader cannot see how you think.

## The README in three paragraphs

GitHub's advice: say what the project does, why it is useful, how to start. Add your design reasoning, in three short paragraphs.

```md
# checkout
A TypeScript package for a bookstore checkout: price an order, pay through an injected gateway, track its status, announce events.

**What it does.** `createCheckout({ gateway, rules, newId })` returns `placeOrder`, `pay`, `ship`, `cancel`, `getOrder` and `on`. [a 5-line usage example]

**Design decisions.** Money is immutable, so amounts cannot change by accident. Discounts are rule objects in a list, so a new offer is a new object. The gateway is injected, so tests use a fake. The order lifecycle is a transition table, so an illegal move fails in one place. Events let email and audit react without checkout knowing them.

**Trade-offs and next steps.** Orders live in memory, so a restart loses them. The busy lock protects one process only. I used a table, not State classes, because the states differ in what is allowed, not in behavior.
```

```narrate
The readme answers three questions in three short paragraphs. What does it do, with a tiny usage example. Which design decisions did I make, and what does each buy. And what are the trade offs, and what would I do next. Be honest in the last one. Naming a real limit, like orders living in memory, shows judgment. A readme with no limits sounds like it was never used.
```

## What to say in the interview

Say only what you built, and be ready to explain every decision.

| They ask | Shape of your answer |
|---|---|
| "What did you build?" | what it does, then its shape: "five small parts behind one public file" |
| "Why objects here?" | pick one pain you felt: a new discount, a new gateway, an illegal state |
| "What was hard?" | the busy lock, or changing status only after the charge |
| "What would you change?" | a real trade-off, then the concrete next step |

> **Say it out loud:** "I built a small checkout package in TypeScript. It prices an order with discount rules, takes payment through an injected gateway, tracks the order through a transition table, and announces events. New rules, gateways and listeners plug in without edits, and the tests prove it. Next I would put a repository interface behind the in-memory orders, and move the lock into the database."

```narrate
Say only what you built, and be ready to explain every decision. When they ask what you built, say what it does and its shape. When they ask why objects, pick one pain you actually felt, like a new discount or an illegal order state. When they ask what you would change, name a real limit and the concrete next step.
```

```quiz
q: 'Asked "What would you change?", which answer is strongest?'
options:
  - nothing, it is finished
  - everything, I would rewrite it in another language
  - orders live in memory, so I would add a repository interface first; the lock works in one process only, so I would move it into the database
answer: 2
why: A specific limit, the reason it matters and the next step show you understand the design. Vague answers do not.
```

## Your turn

Open the work copy. `money.ts`, `errors.ts` and `types.ts` are given: they are the contract. This is a deliberate variant of `curriculum/_kit/bookstore/`: a shipped package cannot import from the course, and its `Money` throws `RangeError`. Fill in the rest, using your lessons 01 to 06 as a base where the names match.

- `discounts.ts`: `subtotalOf`, `percentOff`, `bulkDiscount`, `totalDiscount` (capped at the subtotal)
- `order.ts`: `transitionFor`, a table of status and action
- `events.ts`: `createEventBus`. Errors go to `reportError`
- `checkout.ts`: `createCheckout`
- `index.ts`: export **only** the five public names (plus types). `export *` fails the test

The tests use only `index.ts`. Rules, gateways and listeners written **in the test** must plug in unchanged.

Run `pnpm lesson test oop/12-ship-the-capstone`. Then do the git and README steps in your own repo.

```hint
Start with `discounts.ts` and `order.ts`: they are small and pure. `transitionFor` is a table, `Record<status, Partial<Record<action, { to, refunds }>>>`, and it throws a `CheckoutError` for a missing entry.
```

```hint
In `createCheckout` keep a `Map` of orders, a `Map` of receipt ids, and a `Set` of busy order ids. A helper `run({ orderId, action, work })` can do the lookup, the busy check, the transition check, and the lock with `try/finally`.
```

```hint
`pay`: add the order id to the busy set before the first `await`. Call `gateway.charge`. Only if it succeeded, set `order.status = transition.to`, keep the receipt id, and publish `OrderPaid`. On decline, publish `PaymentDeclined` and return the order unchanged.
```

```hint
Event bus: loop over a copy of the listeners. Wrap each call in `try/catch`. If the listener returns a promise, attach `.catch(reportError)` to it.
```

```hint
`index.ts`: `export { createCheckout } from "./checkout.ts";` and so on for `bulkDiscount`, `percentOff`, `CheckoutError` and `Money`. Re-export types with `export type { ... }`, since types disappear at run time.
```
