---
title: LLD interview - vending machine
lang: ts
minutes: 40
level: junior
roles: [backend, ai]
files: [vendingMachine.ts]
sources:
  - https://refactoring.guru/design-patterns/state
  - https://educative.io/courses/grokking-the-low-level-design-interview-using-ood-principles/class-diagram-for-the-vending-machine
  - https://www.hellointerview.com/learn/low-level-design/in-a-hurry/delivery
  - https://algo.monster/courses/lld/lld_delivery_framework
---

## Booleans multiply

A vending machine answers the same buttons differently depending on what it is doing. The first draft keeps flags:

```ts
insertCoin(coin) {
  if (this.isSoldOut) return reject("sold-out");
  if (this.isDispensing) return reject("busy");
  this.hasMoney = true;
}
```

Three flags make 8 combinations. Only 4 are real. The other 4, such as "dispensing with no money", are bugs waiting for the next requirement. Then someone says "when the motor jams, refund and carry on", and you must reason about every flag in every method.

```svg Three flags allow eight combinations, but the machine has four real states
<svg viewBox="0 0 520 200" role="img" aria-label="Eight flag combinations, four real and four impossible">
  <g font-family="var(--font-mono)" font-size="11" text-anchor="middle">
    <g data-cue="valid">
      <text x="10" y="22" text-anchor="start" fill="var(--fg-muted)">flags: hasMoney, isDispensing, isSoldOut</text>
      <rect x="10" y="34" width="118" height="46" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="69" y="53" fill="var(--fg)">no no no</text>
      <text x="69" y="70" fill="var(--fg-muted)">idle</text>
      <rect x="135" y="34" width="118" height="46" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="194" y="53" fill="var(--fg)">yes no no</text>
      <text x="194" y="70" fill="var(--fg-muted)">has money</text>
      <rect x="260" y="34" width="118" height="46" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="319" y="53" fill="var(--fg)">yes yes no</text>
      <text x="319" y="70" fill="var(--fg-muted)">dispensing</text>
      <rect x="385" y="34" width="118" height="46" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="444" y="53" fill="var(--fg)">no no yes</text>
      <text x="444" y="70" fill="var(--fg-muted)">out of stock</text>
    </g>
    <g data-cue="impossible">
      <rect x="10" y="100" width="118" height="46" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="69" y="119" fill="var(--fg)">no yes no</text>
      <text x="69" y="136" fill="var(--fg-muted)">?</text>
      <rect x="135" y="100" width="118" height="46" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="194" y="119" fill="var(--fg)">no yes yes</text>
      <text x="194" y="136" fill="var(--fg-muted)">?</text>
      <rect x="260" y="100" width="118" height="46" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="319" y="119" fill="var(--fg)">yes no yes</text>
      <text x="319" y="136" fill="var(--fg-muted)">?</text>
      <rect x="385" y="100" width="118" height="46" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="444" y="119" fill="var(--fg)">yes yes yes</text>
      <text x="444" y="136" fill="var(--fg-muted)">?</text>
      <text x="10" y="172" text-anchor="start" fill="var(--danger)">bottom row: states no one designed</text>
    </g>
  </g>
</svg>
```

```narrate
Three yes or no flags give eight combinations. [[valid]] The top row shows the four that are real: idle, has money, dispensing, and out of stock. [[impossible]] The bottom row shows four that no one designed, like dispensing with no money. Nothing stops the code from reaching them, and every new requirement makes them more likely.
```

> **Why:** a state machine names the real states and makes the rest unreachable.

## Steps 1 and 2: ask, then name

Ask until you can say the scope out loud.

| Question | Answer to commit to |
|---|---|
| What can a customer do? | insert a coin, select a product, cancel |
| What can go wrong? | wrong coin, not enough money, sold out, the motor jams |
| How is change made? | largest coins first from the accepted list. A limited coin float is out of scope |
| Who refills it? | an operator, with `restock` |

Nouns: `Product` (data), `Dispenser` (hardware, so an interface), `PurchaseRule` (a rule that will change). Verbs: `insertCoin`, `select`, `cancel`, `restock`.

```narrate
Ask the questions, then commit to answers. A customer can insert a coin, select a product, or cancel. Things can go wrong in four ways. Change uses the largest coins first, and a limited supply of coins is out of scope. Then name the nouns and verbs. The hardware dispenser becomes an interface, and purchase rules become a list you can extend.
```

> **Trap:** modelling the buttons and the display. The question is about behavior, not a user interface.

## Step 3: draw the states

Draw **states** as boxes and **events** as arrows. Each arrow answers: "in this state, when this happens, where do we go?"

```svg Four states. Each arrow is an event that moves the machine to another state
<svg viewBox="0 0 520 290" role="img" aria-label="State diagram of the vending machine">
  <g font-family="var(--font-mono)" font-size="11">
    <g data-cue="idle">
      <rect x="20" y="60" width="110" height="52" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="75" y="91" text-anchor="middle" fill="var(--fg)" font-size="14">idle</text>
    </g>
    <g data-cue="hasMoney">
      <rect x="205" y="60" width="110" height="52" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="91" text-anchor="middle" fill="var(--fg)" font-size="14">hasMoney</text>
      <path d="M130 76 L203 76 M194 70 L203 76 L194 82" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <text x="167" y="68" text-anchor="middle" fill="var(--fg-muted)">coin</text>
      <path d="M205 100 L132 100 M141 94 L132 100 L141 106" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="167" y="120" text-anchor="middle" fill="var(--fg-muted)">cancel</text>
    </g>
    <g data-cue="dispensing">
      <rect x="390" y="60" width="110" height="52" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="445" y="91" text-anchor="middle" fill="var(--fg)" font-size="14">dispensing</text>
      <path d="M315 86 L388 86 M379 80 L388 86 L379 92" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <text x="352" y="78" text-anchor="middle" fill="var(--fg-muted)">select ok</text>
      <path d="M445 60 C445 10 75 10 75 58 M69 49 L75 59 L81 49" fill="none" stroke="var(--ok)" stroke-width="2"/>
      <text x="260" y="46" text-anchor="middle" fill="var(--fg-muted)">done with stock left, or a jam with refund</text>
    </g>
    <g data-cue="outOfStock">
      <rect x="205" y="190" width="110" height="52" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="221" text-anchor="middle" fill="var(--fg)" font-size="14">outOfStock</text>
      <path d="M430 112 L318 196 M326 186 L318 196 L330 194" fill="none" stroke="var(--danger)" stroke-width="2"/>
      <text x="440" y="168" text-anchor="middle" fill="var(--fg-muted)">last item sold</text>
      <path d="M205 216 L75 216 L75 114 M69 124 L75 114 L81 124" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <text x="140" y="208" text-anchor="middle" fill="var(--fg-muted)">restock</text>
    </g>
  </g>
</svg>
```

```narrate
Read the diagram from the left. [[idle]] The machine rests in idle. [[hasMoney]] A coin moves it to has money, and cancel brings it back with a refund. [[dispensing]] A good selection moves it to dispensing, and when the product is out it returns to idle, even after a jam. [[outOfStock]] If that was the last item, it goes to out of stock instead, and a restock brings it back to idle.
```

## Step 4: one object per state

Write the table the diagram implies. Every cell becomes a method on a state object.

| State | `insertCoin` | `select` | `cancel` |
|---|---|---|---|
| idle | add, go to hasMoney | no-money | refund nothing |
| hasMoney | add | check, maybe dispense | refund, go to idle |
| dispensing | busy | busy | busy |
| outOfStock | sold-out | sold-out | refund nothing |

That is the **State** pattern: the machine holds a current state object and delegates to it. A state can pick the next state itself (Refactoring Guru).

> **Not this:** a `switch (this.state)` inside every method. A new state then edits four methods.

> **Trap:** two states and one rule do not need this. Refactoring Guru: State is "overkill" for few states or rarely changing ones. An enum and one `if` is fine.

```quiz
q: In the table, a new action "insertCard" arrives. What is the cost?
options:
  - one new method on each of the four state objects
  - a new flag on the machine
  - nothing, the machine already handles it
answer: 0
why: A new action is a new column. Every state must say what it does, and the compiler or the tests tell you which one you forgot.
```

```narrate
Turn the diagram into a table with a row for each state and a column for each action. Every cell becomes a method on a small state object. The machine holds the current state and passes each call to it. A new state is a new row, and a new action is a new column. Do not use this for two states and one rule.
```

## The async catch

Dispensing takes time, so `select` waits for the hardware. Between "start" and "done" a second customer can press buttons.

```svg The machine must be in dispensing before it waits, or a coin slips in
<svg viewBox="0 0 520 240" role="img" aria-label="Sequence of select, a rejected coin and completion">
  <g font-family="var(--font-mono)" font-size="12">
    <text x="70" y="16" text-anchor="middle" fill="var(--fg)">customer</text>
    <text x="250" y="16" text-anchor="middle" fill="var(--fg)">machine</text>
    <text x="430" y="16" text-anchor="middle" fill="var(--fg)">dispenser</text>
    <path d="M70 24 L70 236 M250 24 L250 236 M430 24 L430 236" stroke="var(--border)" stroke-width="2"/>
    <g data-cue="select">
      <path d="M70 52 L246 52" stroke="var(--primary)" stroke-width="2"/>
      <text x="80" y="46" fill="var(--fg)">select A1</text>
      <rect x="258" y="58" width="150" height="24" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="266" y="75" fill="var(--fg)">state = dispensing</text>
      <path d="M250 104 L426 104" stroke="var(--primary)" stroke-width="2"/>
      <text x="300" y="98" fill="var(--fg)">dispense (waits)</text>
    </g>
    <g data-cue="busy">
      <path d="M70 140 L246 140" stroke="var(--primary)" stroke-width="2"/>
      <text x="80" y="134" fill="var(--fg)">insert coin</text>
      <path d="M246 164 L74 164" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="100" y="158" fill="var(--danger)">busy, coin refused</text>
    </g>
    <g data-cue="done">
      <path d="M426 196 L254 196" stroke="var(--primary)" stroke-width="2"/>
      <text x="300" y="190" fill="var(--fg)">resolved</text>
      <rect x="258" y="204" width="140" height="24" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="266" y="221" fill="var(--fg)">stock - 1, idle</text>
    </g>
  </g>
</svg>
```

```narrate
[[select]] The customer selects a product. The machine switches to dispensing first, and only then waits for the hardware. [[busy]] While it waits, another coin arrives, and the dispensing state refuses it. [[done]] When the hardware finishes, the machine uses one unit of stock and goes back to idle, or to out of stock if that was the last item.
```

> **Trap:** `await dispenser.dispense()` and **then** set the state. In that gap the machine is still `hasMoney`, a second coin is accepted, and the change is wrong. Change state **before** the first `await`.

## New requirements land in one place

Follow-ups, and where each one lands:

| Follow-up | Cost |
|---|---|
| a 50 cent coin | one more number in `acceptedCoins`. Change-making reads that list |
| ID check for beer | one `PurchaseRule` in the `rules` list |
| pay by card | a new action: one method on each state |
| limited coin float | a new `ChangeMaker` behind an interface, when this arrives |

> **Why:** coins and rules are data and functions that the states **receive**. The states never name a coin or a product.

> **Not this:** `const COINS = [100, 25, 10, 5]` inside the change code, plus `if (product.name === "Beer")` inside `select`. Each follow-up then edits the state classes.

```narrate
Walk through the follow-ups. A fifty cent coin is one more number in the accepted coin list, because change is made from that list. An ID check for beer is one more rule in the rules list. Paying by card is a new action, so each state gets one new method. Name the seam for each one before the interviewer asks.
```

## Say it, then build it

> **Say it out loud:** "The machine has four real states, so I made one object per state instead of boolean flags. Each state decides what each action does and which state comes next. Coins and purchase rules are passed in, so a new coin or a new rule does not touch the states."

Also name what you left out: change float, card payment, a display. Then trace one purchase aloud before you finish.

```narrate
Close the design in one sentence. The machine has four real states, so each is an object, and each decides what every action does and what comes next. Coins and purchase rules are passed in, so a new coin or a new rule does not touch the states. Then say what you left out, and trace one purchase aloud.
```

## Your turn

`contracts.ts` holds the types, reasons and state names. Read it, do not edit it. Implement `createVendingMachine(options)` in `vendingMachine.ts`.

- States: idle, hasMoney, dispensing, outOfStock, each an object
- Starts out of stock if nothing is in stock
- Change and refunds: largest accepted coin first
- Dispenser rejects: refund everything, keep the stock, go idle
- `restock` revives an out-of-stock machine
- Do not change the product list you were given

The tests add a new coin and new purchase rules **in the test**. Your code must accept them unchanged.

Run `pnpm lesson test oop/10-lld-vending-machine`.

```hint
Copy the products into a `Map` so you never mutate the caller's objects. Keep `balanceCents` and a `state` variable in the closure.
```

```hint
Write the four state objects, each with `insertCoin`, `select`, `cancel`, and a `name`. They change the current state by assigning to `state`. Fill them from the table in the lesson.
```

```hint
In `hasMoney.select` check in this order: unknown product, product sold out, rules (first string wins), then price. Then call a `dispense` helper.
```

```hint
In `dispense`, set `state = dispensing` before `await dispenser.dispense(code)`. Wrap the await in `try/catch`. After success, move to idle or outOfStock depending on whether any product still has stock.
```
