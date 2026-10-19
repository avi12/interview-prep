---
title: Polymorphism replaces conditionals
lang: ts
minutes: 25
level: junior
roles: [backend, ai]
files: [discounts.ts, checkout.ts]
sources:
  - https://refactoring.guru/design-patterns/strategy
  - https://refactoring.guru/replace-conditional-with-polymorphism
  - https://martinfowler.com/bliki/TellDontAsk.html
  - https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction
  - https://www.typescriptlang.org/docs/handbook/2/narrowing.html
---

## A calculator full of ifs

The bookstore needs discounts. The first version is one function: a `type` string and an `if` for each kind.

```ts
function discountFor({ type, lines, subtotal, shippingFee }) {
  if (type === "PERCENT_10") return subtotal * 0.1;
  if (type === "BUY_TWO_GET_ONE") {
    let free = 0;
    for (const line of lines) free += Math.floor(line.quantity / 3) * line.price;
    return free;
  }
  if (type === "FREE_SHIPPING") return subtotal >= 50 ? shippingFee : 0;
  return 0;
}
```

It works, and it is all in one place. For about a week.

```narrate
Our checkout now needs discounts. The first version is one function with a type string and an if for each kind: percent off, buy two get one free, and free shipping. It works, and everything is in one place. Hold on to that feeling, because it lasts about a week.
```

## A new discount arrives

Marketing wants **author day**: half price on chosen authors. You add a branch to `discountFor`. Then you find the same `type` string in other places:

- `labelFor(type)` prints the receipt line
- the admin dropdown lists the types
- the sales report has one column per type

```ts
function labelFor(type: string) {
  if (type === "PERCENT_10") return "10% off";
  if (type === "BUY_TWO_GET_ONE") return "Buy 2 get 1 free";
  if (type === "FREE_SHIPPING") return "Free shipping";
}
```

Four places, and nothing links them. Forget `labelFor` and the receipt prints `undefined`. The compiler is silent, because `type` is just a string.

```narrate
Marketing wants author day, half price on chosen authors. Easy: one more branch in the discount function. But the same type string is also used by the receipt label, the admin dropdown and the sales report. Four places, and nothing links them. Forget the label and the receipt prints undefined. The compiler stays silent, because the type is just a string.
```

## One interface, many classes

Ask what stays the same. Every discount reads the cart and answers with an amount of money. Write that shape as an `interface`, and make each discount a class that **implements** it.

`Checkout` loops over the rules and calls `discountFor`. It never asks which kind. That is **polymorphism**: one call, and the object decides what runs.

```ts
export interface DiscountRule {
  readonly name: string;
  discountFor(context: PricingContext): Money;
}

for (const rule of this.#rules) {
  const amount = rule.discountFor(context);
  discounts.push({ rule: rule.name, amount });
}
```

```svg The same new discount: four edits with a type string, one new class with an interface
<svg viewBox="0 0 520 250" role="img" aria-label="Change radius of adding a discount, before and after">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="req">
      <rect x="20" y="8" width="480" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="28" text-anchor="middle" fill="var(--fg)">NEW DISCOUNT: author day</text>
    </g>
    <g data-cue="before">
      <text x="20" y="64" fill="var(--fg-muted)">BEFORE: a type string</text>
      <rect x="20" y="76" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="97" fill="var(--fg)">discountFor(): edit</text>
      <rect x="20" y="118" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="139" fill="var(--fg)">labelFor(): edit</text>
      <rect x="20" y="160" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="181" fill="var(--fg)">admin dropdown: edit</text>
      <rect x="20" y="202" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="223" fill="var(--fg)">sales report: edit</text>
    </g>
    <g data-cue="checkout">
      <text x="270" y="64" fill="var(--fg-muted)">AFTER: an interface</text>
      <rect x="270" y="76" width="230" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="97" text-anchor="middle" fill="var(--fg)">Checkout: untouched</text>
      <path d="M385 108 L385 118 M381 113 L385 118 L389 113" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <rect x="270" y="118" width="230" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="139" text-anchor="middle" fill="var(--fg)">interface DiscountRule</text>
    </g>
    <g data-cue="new">
      <rect x="270" y="160" width="112" height="32" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="3"/>
      <text x="326" y="181" text-anchor="middle" fill="var(--fg)">AuthorDay: new</text>
    </g>
    <g data-cue="rules" font-size="10">
      <rect x="388" y="160" width="112" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="444" y="181" text-anchor="middle" fill="var(--fg)">PercentOff</text>
      <rect x="270" y="202" width="112" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="326" y="223" text-anchor="middle" fill="var(--fg)">BuyTwoGetOneFree</text>
      <rect x="388" y="202" width="112" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="444" y="223" text-anchor="middle" fill="var(--fg)">FreeShippingFrom</text>
    </g>
  </g>
</svg>
```

```narrate
[[req]] Marketing asks for one more discount, author day. [[before]] On the left, the discount is a type string, so the calculator, the label function, the admin dropdown and the sales report all need a new branch. Miss one and the receipt prints undefined. [[checkout]] On the right, checkout only knows the interface called discount rule. [[new]] Author day is one new class that implements it. [[rules]] The three old rules stay exactly as they are.
```

> **Why:** the compiler checks that every class has `name` and `discountFor`. A missing method is a build error, not `undefined` on a receipt. One honest edit remains: the place that builds the list of rules gets one new line.

```quiz
q: A fourth discount arrives and Checkout uses the DiscountRule interface. What is the smallest change?
options:
  - add a branch in Checkout for the new type
  - write one new class and add it to the list of rules
  - edit all three existing rule classes
answer: 1
why: Checkout only calls discountFor, so it cannot tell a new class from an old one. New behavior is new code, not edited code.
```

## Not every if needs classes

> **Not this:** one `Discount` type with optional fields (`percent?`, `threshold?`, `freeEvery?`) and a `kind` switch. Each new rule adds a field and a branch, and impossible combinations still compile.

> **Trap:** two rules that never change do not need an interface. A plain `if`, or a function `(context) => Money`, is simpler. Sandi Metz: duplication is far cheaper than the wrong abstraction. Wait for the third variant.

What keeps growing decides the tool:

| What keeps growing | Use |
|---|---|
| new kinds of discount, same few operations | interface and classes |
| new operations, a fixed list of kinds | union and an exhaustive `switch` |

```ts
type Shipping = { kind: "standard" } | { kind: "express" };

function label(shipping: Shipping) {
  switch (shipping.kind) {
    case "standard": return "Standard";
    case "express": return "Express";
    default: {
      const unreachable: never = shipping;
      return unreachable;
    }
  }
}
```

```narrate
Not every if needs classes. Do not squeeze every kind into one type with optional fields, because every new rule adds another field. And if you only have two rules and they never change, a plain if is simpler. Ask what keeps growing. New kinds with few operations suit classes. A fixed list of kinds with many operations suits a union and a switch, where the compiler lists every place you missed.
```

```quiz
q: Shipping has two options that will not change for years. What fits best?
options:
  - a Strategy interface with a class per option and a factory
  - a small union and a switch, or just an if
  - one class with optional fields
answer: 1
why: A tiny, stable set does not repay the extra classes. Reach for polymorphism when variants multiply or change often.
```

## Say it in the interview

Interviewers ask "what is polymorphism?" Answer with a story, not a definition.

| Say | It means |
|---|---|
| polymorphism | one call, the object decides which code runs |
| Strategy pattern | each variant of an algorithm is a class behind one interface |
| Open/Closed Principle | open for extension, closed for modification |
| program to an interface | depend on the shape, not on the class |
| replace conditional with polymorphism | the refactoring that moves each branch into a class |

> **Say it:** "A growing `if (type === ...)` chain is a smell. I moved each branch into a class behind one interface, so a new discount is a new class and checkout is not edited. I would not do it for two stable cases."

```narrate
When asked about polymorphism, tell the story. Say: a growing chain of if type equals is a smell. I moved each branch into a class behind one interface, so a new discount is a new class and checkout is not edited. Then add the part that shows judgment: I would not do this for two cases that never change. The names to drop are polymorphism, the Strategy pattern, and the Open Closed Principle.
```

## Your turn

Open `discounts.ts` and `checkout.ts`. The `DiscountRule` interface and `Money` (`curriculum/_kit/bookstore/`) are given.

- `PercentOff({ percent })`: that percentage of the subtotal, rounded to the nearest cent. Name `10% off`
- `BuyTwoGetOneFree`: per title, every third copy is free. Name `Buy 2 get 1 free`
- `FreeShippingFrom({ threshold })`: the shipping fee when the subtotal is at or above the threshold, else zero. Name `Free shipping`
- `Checkout.quote({ lines, shippingFee })`: compute the subtotal, call every rule once with the same `{ lines, subtotal, shippingFee }`, list the rules that gave more than zero in the order given, and never let the total go below zero

The tests also bring a rule you have never seen. If `Checkout` mentions a rule class by name, it fails.

Run `pnpm lesson test oop/02-polymorphism-replaces-conditionals`.

```hint
Start with `PercentOff`. `Money` already has `percentage`, and `name` can be built in the constructor.
```

```hint
In `Checkout`, loop over `this.#rules` with `for...of` and call `rule.discountFor(context)`. Nothing else about the rule matters, not even its class.
```

```hint
`BuyTwoGetOneFree`: for each line, `Math.floor(quantity / 3)` free copies times the unit price, added up with `Money.zero(...)` as the start.
```

```hint
Total: gross is subtotal plus shipping. Add up the listed discounts. If they are greater than gross (`isGreaterThan`), take away gross instead, so the total is zero.
```
