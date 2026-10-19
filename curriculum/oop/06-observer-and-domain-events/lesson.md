---
title: Observer and domain events
lang: ts
minutes: 30
level: junior
roles: [backend, ai]
files: [eventBus.ts, placeOrder.ts, listeners.ts]
sources:
  - https://refactoring.guru/design-patterns/observer
  - https://martinfowler.com/eaaDev/DomainEvent.html
  - https://martinfowler.com/articles/201701-event-driven.html
  - https://nodejs.org/api/events.html
---

## placeOrder does everything

Placing an order is the heart of the checkout. After saving, it does every follow-up by hand: email, stock counts, loyalty points.

```ts
async function placeOrder({ customerEmail, lines }: PlaceOrderInput) {
  const order = toOrder({ customerEmail, lines });
  await orders.save(order);
  await mailer.send(confirmationFor(order));
  await inventory.recordSale(order.lines);
  await loyalty.award({ email: customerEmail, points: pointsFor(order.total) });
  return order.id;
}
```

It reads fine today.

```narrate
Placing an order is the heart of the checkout. After saving the order, this function does every follow up by hand: it sends the email, updates the stock counts and awards loyalty points. Each step is one line, and today it reads fine.
```

## Every need edits it

Now add analytics, a warehouse chat ping, a fraud check. Each one means:

- a new dependency in the signature of `placeOrder`
- a new line inside it
- a new fake in every test of it

And the lines are chained. If the mailer is down, the stock is never updated and the points never awarded. One side effect blocks all the others behind it.

```narrate
Now product wants analytics, a ping to the warehouse chat and a fraud check. Each one adds a dependency to the signature, a new line inside the function, and a new fake in every test. Worse, the lines are chained. If the mailer is down, the stock is never updated and the points are never awarded. One side effect blocks everything behind it.
```

## Publish what happened

`placeOrder` saves the order, then announces a fact in the past tense: **OrderPlaced**. Anyone who cares **subscribes**. This is the **Observer pattern**, and a named fact like this is a **domain event**. The publisher never knows who listens, so adding a listener never edits it.

```ts
await orders.save(order);
await bus.publish({ type: "OrderPlaced", orderId: order.id, customerEmail, lines, total });

bus.subscribe("OrderPlaced", new ConfirmationEmailListener({ mailer }));
bus.subscribe("OrderPlaced", new StockListener({ inventory }));
bus.subscribe("OrderPlaced", new LoyaltyListener({ ledger }));
```

```svg The same new need: the publisher edited with every listener before, one new listener and one subscribe line after
<svg viewBox="0 0 520 250" role="img" aria-label="Change radius of adding a listener, before and after">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="req">
      <rect x="20" y="8" width="480" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="28" text-anchor="middle" fill="var(--fg)">NEW NEED: ping the warehouse chat</text>
    </g>
    <g data-cue="before">
      <text x="20" y="64" fill="var(--fg-muted)">BEFORE: placeOrder calls everyone</text>
      <rect x="20" y="76" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="97" fill="var(--fg)">placeOrder body: edit</text>
      <rect x="20" y="118" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="139" fill="var(--fg)">its signature: edit</text>
      <rect x="20" y="160" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="181" fill="var(--fg)">its tests: edit</text>
      <rect x="20" y="202" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="223" fill="var(--fg)">the wiring: edit</text>
    </g>
    <g data-cue="publisher">
      <text x="270" y="64" fill="var(--fg-muted)">AFTER: placeOrder publishes</text>
      <rect x="270" y="76" width="230" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="97" text-anchor="middle" fill="var(--fg)">placeOrder: untouched</text>
      <path d="M385 108 L385 118 M381 113 L385 118 L389 113" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <rect x="270" y="118" width="230" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="139" text-anchor="middle" fill="var(--fg)">EventBus: OrderPlaced</text>
    </g>
    <g data-cue="new">
      <rect x="270" y="160" width="112" height="32" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="3"/>
      <text x="326" y="181" text-anchor="middle" fill="var(--fg)" font-size="11">Chat ping: new</text>
    </g>
    <g data-cue="root">
      <rect x="388" y="160" width="112" height="32" fill="var(--surface-2)" stroke="var(--accent-2)" stroke-width="3"/>
      <text x="444" y="181" text-anchor="middle" fill="var(--fg)" font-size="11">main.ts: 1 line</text>
    </g>
    <g data-cue="rest">
      <rect x="270" y="202" width="230" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="223" text-anchor="middle" fill="var(--fg)">3 old listeners: untouched</text>
    </g>
  </g>
</svg>
```

```narrate
[[req]] A new need arrives: tell the warehouse chat about every order. [[before]] On the left, placeOrder itself changes, along with its signature, its tests and the wiring. [[publisher]] On the right, placeOrder only announces the event on the bus, and it does not change. [[new]] The warehouse chat is one new listener class. [[root]] The only edit is one subscribe line in main. [[rest]] The email, stock and points listeners are untouched.
```

> **Why:** events flip the dependency. Before, `placeOrder` had to know everyone who cares. Now everyone who cares knows `placeOrder`'s event, and it knows nobody.

## What it costs

Events are not free. Be honest about three costs:

- **Hidden flow.** Reading `placeOrder` no longer shows what happens next. Fowler: such a flow "is not explicit in any program text"
- **Ordering.** Our bus runs listeners in subscription order. The Observer pattern in general promises none, so never rely on an order you did not choose
- **Failure.** The order is already saved when a listener fails. Our bus reports the error and carries on

> **Trap:** do not use events for a step that **must** succeed with the order, like charging the card. Do it inline. Events fit side effects that can lag or fail alone: email, stock counts, points, analytics.

```narrate
Events are not free, so be honest about three costs. First, hidden flow: reading place order no longer shows what happens next. Second, ordering: our bus runs listeners in the order they subscribed, but the pattern in general promises no order, so never rely on one you did not choose. Third, failure: the order is already saved when a listener fails. And never use events for a step that must succeed with the order, like charging the card.
```

## Why not Node's EventEmitter?

Node ships `EventEmitter`. By the Node docs, `emit` calls listeners synchronously and **ignores what they return**. An async listener's promise is dropped, and an `'error'` event with no listener crashes the process.

> **Not this:** `emitter.emit("orderPlaced", order)` with async listeners. `placeOrder` cannot know when they finish or whether one failed.

Our `EventBus` awaits each listener in order, and sends every failure to one handler.

```quiz
q: Why does our EventBus await each listener instead of just calling them?
options:
  - placeOrder can finish knowing every side effect is done, and failures reach one handler
  - Node requires listeners to be awaited
  - so that all listeners run at the same time
answer: 0
why: Awaiting in order makes the result predictable and the failures visible. The price is that the slowest listener sets the pace of placeOrder.
```

```narrate
Node already has an event emitter, so why write a bus? Its emit method calls listeners one after another and ignores whatever they return. So an async listener's promise is dropped, and placeOrder cannot know when it finished or whether it failed. Our bus waits for each listener in order and sends every failure to one handler. The price is that the slowest listener sets the pace of placeOrder.
```

## Say it in the interview

| Say | It means |
|---|---|
| Observer pattern | a subject notifies subscribers without knowing them |
| publish/subscribe | the same idea, with a bus between the two sides |
| domain event | a past-tense fact about the business: `OrderPlaced` |
| event notification | Fowler's name for "something happened", with no reply expected |
| coupling | how much one part must know about another |
| idempotent listener | handling the same event twice does no harm |

> **Say it:** "I decoupled placing an order from its side effects with a domain event. A new listener never touches checkout. The price is hidden control flow, so I keep must-succeed steps inline and use events only for side effects that can fail on their own."

```narrate
Say: I decoupled placing an order from its side effects with a domain event. A new listener never touches checkout. The price is hidden control flow, so I keep must succeed steps inline and use events only for side effects that can fail on their own. The words to know are the Observer pattern, publish and subscribe, domain event, and idempotent listener, which links to the idempotency lesson in the backend track.
```

## Your turn

`events.ts`, `ports.ts`, `fakes.ts`, `Money` and `DomainError` (`curriculum/_kit/bookstore/`) are given. Open three files:

`eventBus.ts`, `new EventBus({ onListenerError })`:

- `subscribe(type, listener)` returns an `unsubscribe` function
- `publish(event)` calls the listeners of `event.type` in subscription order, **awaiting each**. A listener that throws or rejects goes to `onListenerError({ event, listener, error })` and the rest still run

`placeOrder.ts`, `createPlaceOrder({ orders, bus, newId })`: no lines throws `DomainError`; save the order, **then** publish `OrderPlaced`, return `{ orderId }`.

`listeners.ts`: `ConfirmationEmailListener` is the worked example. Write `StockListener` (`recordSale` for each line) and `LoyaltyListener` (one point per whole dollar, nothing recorded for zero).

The tests bring a listener and an event type you have never seen. If `placeOrder` or the bus names one, it fails.

Run `pnpm lesson test oop/06-observer-and-domain-events`.

```hint
Start with the bus. A `Map` from event type to a list of subscriptions is enough. `publish` is a `for...of` with `try` and `await listener.handle(event)`.
```

```hint
When you subscribe, build a new array instead of pushing into the old one. Then a listener added while `publish` is running cannot change the loop that is already going.
```

```hint
`unsubscribe` is the function you return from `subscribe`: it filters that one subscription out.
```

```hint
In `placeOrder`, build the event as a typed `OrderPlaced` constant first, then `await bus.publish(event)`. Save before publish, so listeners can find the order.
```
