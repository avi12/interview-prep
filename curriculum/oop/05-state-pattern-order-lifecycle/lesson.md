---
title: State pattern - the order lifecycle
lang: ts
minutes: 30
level: junior
roles: [backend, ai]
files: [states.ts, order.ts]
sources:
  - https://refactoring.guru/design-patterns/state
  - https://refactoring.guru/design-patterns/strategy
  - https://www.typescriptlang.org/docs/handbook/2/narrowing.html
  - https://martinfowler.com/bliki/AnemicDomainModel.html
---

## Status is just a string

An order moves through a lifecycle, and `status` is a plain string. Each function checks what it thinks is enough.

```ts
type Order = { id: string; status: string; total: number };

function ship(order: Order) {
  if (order.status !== "delivered") order.status = "shipped";
}

function cancel(order: Order) {
  if (order.status === "pending" || order.status === "paid") order.status = "cancelled";
}
```

`ship` only checks "not delivered". So it ships a **cancelled** order, and an unpaid one. Nothing says which moves are legal; the rules hide in every function that touches `status`. A typo like `"canceled"` is silently a different state.

```narrate
An order moves through a lifecycle, and the status is a plain string. Each function checks whatever it thinks is enough. Look at ship: it only checks that the order is not delivered. So it ships a cancelled order, and an unpaid one. Nothing says which moves are legal. The rules hide in every function that touches the status, and a typo is just another state.
```

## A new state arrives

The warehouse adds **packing**, between paid and shipped. Now search for `status`:

```ts
function canEditAddress(order: Order) {
  return order.status === "pending" || order.status === "paid";
}
```

`ship`, `cancel`, `pay`, `deliver`, `canEditAddress`, the admin filter, the CSV export. Each needs a decision about `packing`. Miss one and an order moves where it must not, with no error. Nothing lists the places for you.

```narrate
The warehouse adds a packing state between paid and shipped. Now search for every place that reads the status: shipping, cancelling, paying, delivering, the address check, the admin filter and the export. Each one needs a decision about packing. Miss one and an order moves where it must not, and no error tells you. Nothing lists the places for you.
```

## Draw the lifecycle first

Before code, draw it. Boxes are **states**. Arrows are the legal **transitions**. No arrow means the move is illegal.

```svg The lifecycle: forward on the happy path, cancel only early, and shipping a cancelled order is not an arrow at all
<svg viewBox="0 0 520 190" role="img" aria-label="Order lifecycle as a state machine">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="states">
      <rect x="10" y="34" width="86" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="53" y="57" text-anchor="middle" fill="var(--fg)">pending</text>
      <rect x="142" y="34" width="86" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="185" y="57" text-anchor="middle" fill="var(--fg)">paid</text>
      <rect x="274" y="34" width="86" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="317" y="57" text-anchor="middle" fill="var(--fg)">shipped</text>
      <rect x="406" y="34" width="86" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="449" y="57" text-anchor="middle" fill="var(--fg)">delivered</text>
    </g>
    <g data-cue="moves">
      <path d="M96 52 L142 52 M136 48 L142 52 L136 56 M228 52 L274 52 M268 48 L274 52 L268 56 M360 52 L406 52 M400 48 L406 52 L400 56" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <text x="119" y="28" text-anchor="middle" fill="var(--fg-muted)" font-size="10">pay</text>
      <text x="251" y="28" text-anchor="middle" fill="var(--fg-muted)" font-size="10">ship</text>
      <text x="383" y="28" text-anchor="middle" fill="var(--fg-muted)" font-size="10">deliver</text>
    </g>
    <g data-cue="cancel">
      <rect x="60" y="130" width="130" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="125" y="153" text-anchor="middle" fill="var(--fg)">cancelled</text>
      <path d="M53 70 L53 100 L95 100 L95 130 M91 124 L95 130 L99 124 M185 70 L185 100 L155 100 L155 130 M151 124 L155 130 L159 124" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="125" y="118" text-anchor="middle" fill="var(--fg-muted)" font-size="10">cancel</text>
    </g>
    <g data-cue="refused">
      <path d="M190 148 L317 148 L317 76" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <path d="M311 104 L323 116 M323 104 L311 116" fill="none" stroke="var(--danger)" stroke-width="3"/>
      <text x="330" y="136" fill="var(--fg)">ship: refused</text>
    </g>
  </g>
</svg>
```

```narrate
[[states]] An order lives in one of a few states: pending, paid, shipped, delivered. [[moves]] The happy path moves forward one step at a time: pay, ship, deliver. [[cancel]] Cancelled is a fifth state, and you can only get there from pending or paid. [[refused]] Everything else is refused. Shipping a cancelled order is not a missing check. It is simply not an arrow.
```

> **Why:** a state machine turns "which moves are legal" from scattered `if`s into one picture you can read, review and test completely.

## One object per state

Make each state an object. The `Order` holds the current one and **forwards** `pay()`, `ship()`, `deliver()`, `cancel()` to it. A state either moves the order to the next state, or refuses with a domain error. This is the **State pattern**.

```ts
class PaidState implements OrderState {
  readonly name = "paid";

  ship(order: OrderContext) {
    order.moveTo(new ShippedState());
  }

  cancel(order: OrderContext) {
    order.refund(order.total);
    order.moveTo(new CancelledState());
  }

  pay() { refuse({ from: this.name, action: "pay" }); }
  deliver() { refuse({ from: this.name, action: "deliver" }); }
}
```

```svg The same new state: every status check is a candidate for an edit, versus one new class and one arrow
<svg viewBox="0 0 520 250" role="img" aria-label="Change radius of adding a packing state, before and after">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="req">
      <rect x="20" y="8" width="480" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="28" text-anchor="middle" fill="var(--fg)">NEW STATE: packing, between paid and shipped</text>
    </g>
    <g data-cue="before">
      <text x="20" y="64" fill="var(--fg-muted)">BEFORE: status strings</text>
      <rect x="20" y="76" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="97" fill="var(--fg)">ship(), pay(): edit</text>
      <rect x="20" y="118" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="139" fill="var(--fg)">cancel(), deliver(): edit</text>
      <rect x="20" y="160" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="181" fill="var(--fg)">canEditAddress(): edit</text>
      <rect x="20" y="202" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="223" fill="var(--fg)">admin filter, export: edit</text>
    </g>
    <g data-cue="order">
      <text x="270" y="64" fill="var(--fg-muted)">AFTER: state objects</text>
      <rect x="270" y="76" width="230" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="97" text-anchor="middle" fill="var(--fg)">Order: untouched</text>
      <path d="M385 108 L385 118 M381 113 L385 118 L389 113" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <rect x="270" y="118" width="230" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="139" text-anchor="middle" fill="var(--fg)">interface OrderState</text>
    </g>
    <g data-cue="new">
      <rect x="270" y="160" width="112" height="32" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="3"/>
      <text x="326" y="181" text-anchor="middle" fill="var(--fg)" font-size="11">Packing: new</text>
    </g>
    <g data-cue="edit">
      <rect x="388" y="160" width="112" height="32" fill="var(--surface-2)" stroke="var(--accent-2)" stroke-width="3"/>
      <text x="444" y="181" text-anchor="middle" fill="var(--fg)" font-size="11">Paid: 1 line</text>
    </g>
    <g data-cue="rest">
      <rect x="270" y="202" width="230" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="223" text-anchor="middle" fill="var(--fg)">the other 4 states: untouched</text>
    </g>
  </g>
</svg>
```

```narrate
[[req]] The warehouse adds a packing state between paid and shipped. [[before]] On the left, every function that checks the status string is a candidate for an edit, and a missed one allows an illegal move silently. [[order]] On the right, the order only forwards calls to its current state, so it does not change. [[new]] Packing is one new class that says which moves it allows. [[edit]] The only existing change is one line in the paid state, where the arrow into packing starts. [[rest]] The other states are untouched.
```

## Table or classes?

> **Not this:** a boolean per fact: `isPaid`, `isShipped`, `isCancelled`. Eight combinations, most of them nonsense (shipped **and** cancelled), and every function must check several flags.

> **Trap:** State classes are overkill when states differ only in **which** moves are allowed. Then an enum and a table is shorter, and shows the whole lifecycle at a glance. Promote to classes when states also **do** different things: paid refunds on cancel, pending does not. A new *action* also touches every state class.

```ts
const TRANSITIONS = {
  pending: { pay: "paid", cancel: "cancelled" },
  paid: { ship: "shipped", cancel: "cancelled" },
  shipped: { deliver: "delivered" },
  delivered: {},
  cancelled: {}
} as const;
```

```quiz
q: Every state allows different moves, but they all behave the same otherwise. What is simplest?
options:
  - a State class per state with its own methods
  - an enum of states and a transition table
  - a boolean flag for every state
answer: 1
why: When only the allowed moves differ, a table says it in a few lines. Classes pay off when each state needs its own behavior, like a refund.
```

```narrate
Two warnings. Do not use a flag per fact, because most flag combinations are nonsense. And do not reach for state classes when the states only differ in which moves are allowed. A plain enum and a transition table is shorter and shows the whole lifecycle at a glance. Promote to classes when the states also do different things, like the paid state refunding on cancel. The Refactoring Guru page agrees: the pattern is overkill for few states that rarely change.
```

## Say it in the interview

| Say | It means |
|---|---|
| state machine | fixed states, legal transitions, nothing else |
| transition | a move from one state to another |
| guard | a rule that must hold before a transition |
| State pattern | each state is an object that handles the calls |
| State vs Strategy | a state knows its neighbors and moves the context; a strategy does not |

> **Say it:** "I modeled the order lifecycle as a state machine, so an illegal move like shipping a cancelled order fails fast with a domain error instead of depending on scattered ifs. I used state objects because cancel behaves differently per state. For plain allowed-or-not rules, a transition table is enough."

```narrate
Say: I modeled the order lifecycle as a state machine, so an illegal move like shipping a cancelled order fails fast with a domain error instead of depending on scattered ifs. I used state objects because cancelling behaves differently in each state. For plain allowed or not rules, a transition table is enough. And know the difference from Strategy: a state knows its neighbors and moves the order, a strategy does not.
```

## Your turn

`orderTypes.ts` is given: the `OrderState` and `OrderContext` interfaces, `IllegalTransitionError` and `refuse(...)`. So are `Money` and `DomainError`, in `curriculum/_kit/bookstore/`. In `states.ts` every state refuses everything. Open the legal moves:

- `PendingState`: `pay` goes to paid, `cancel` goes to cancelled
- `PaidState`: `ship` goes to shipped; `cancel` refunds the **whole total** (`order.refund(order.total)`), then goes to cancelled
- `ShippedState`: `deliver` goes to delivered
- `DeliveredState` and `CancelledState`: nothing is allowed

In `order.ts`, write `Order({ id, total, state })`: starts `PendingState` unless `state` is given, `status` is the state's `name`, `refunded` starts at zero money, and `pay`, `ship`, `deliver`, `cancel` only forward to the state with a context object.

The tests bring a state you have never seen. If `Order` decides transitions itself, it fails.

Run `pnpm lesson test oop/05-state-pattern-order-lifecycle`.

```hint
Start with `Order`. It holds `#state`, and its four methods are one line each: `this.#state.pay(this.#context)` and so on.
```

```hint
The context is a small object: `total`, `moveTo(next)` which sets `#state`, and `refund(amount)` which adds to `#refunded`. Build it once in the constructor.
```

```hint
In each state, an allowed move calls `order.moveTo(new NextState())`. A refused move is already written with `refuse(...)`, so keep it.
```

```hint
`refuse` throws before `moveTo` runs, so a refused move can never change the status. You get that guarantee for free.
```
