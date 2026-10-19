---
title: Model the domain - Money and Cart
lang: ts
minutes: 25
level: junior
roles: [backend, ai]
files: [money.ts, cart.ts]
sources:
  - https://martinfowler.com/bliki/ValueObject.html
  - https://martinfowler.com/eaaCatalog/money.html
  - https://martinfowler.com/bliki/AnemicDomainModel.html
  - https://martinfowler.com/bliki/TellDontAsk.html
  - https://www.typescriptlang.org/docs/handbook/2/classes.html
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger
---

## A bag of numbers

Over this track you build one small system: the checkout of an online bookstore. Each lesson adds one object-oriented idea, and you see what it saves.

The first version is plain data. It works until real people use it.

```ts
const cart = {
  lines: [{ isbn: "978-0132350884", title: "Clean Code", price: 4.35, quantity: 3 }],
  total: 0
};

cart.lines[0].quantity = -3;
const cents = 4.35 * 100;
```

`cents` is `434.99999999999994`. A quantity of `-3` is accepted. Any code can write any value, so the bug shows up far from the line that caused it.

```narrate
Here is the first version of our bookstore cart: plain data in an object. Nothing stops a quantity of minus three. And four dollars thirty five times one hundred is not four hundred thirty five cents, it is four hundred thirty four point nine nine nine nine and so on. Any code can write any value, so the bug appears far from the line that caused it.
```

## A new rule arrives

Product says: **at most 10 copies of one title per cart.** Where does the check go? Everywhere something writes a quantity.

```ts
function addFromProductPage({ cart, line }) {
  if (line.quantity > 10) return showError();
  cart.lines.push(line);
}

function changeFromCartPage({ cart, isbn, quantity }) {
  if (quantity > 10) return showError();
  findLine(cart, isbn).quantity = quantity;
}

function reorder({ cart, previousOrder }) {
  cart.lines.push(...previousOrder.lines);
}
```

`reorder` was forgotten, so a customer carts 40 copies. Next month the limit becomes 8 and you hunt again.

```narrate
Product asks for a limit: at most ten copies of one title in a cart. In this version the check has to be copied into every function that writes a quantity. Look at reorder: nobody remembered it, so a customer can still cart forty copies. And when the limit changes to eight, you hunt for every copy again.
```

## One door, one rule

Make the data private with `#`. Now the only way to change a cart is a method, and each method checks the rule before it touches anything. A rule that must always hold is an **invariant**. It now has one home.

```ts
export class Cart {
  readonly #lines = new Map<string, CartLine>();

  add(line: CartLine) {
    requireValidQuantity(line.quantity);
    this.#lines.set(line.isbn, { ...line });
  }
}
```

```svg The same new rule: four edits when every door checks, one edit when the cart checks
<svg viewBox="0 0 520 250" role="img" aria-label="Change radius of the ten copies rule, before and after">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="rule">
      <rect x="20" y="8" width="480" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="28" text-anchor="middle" fill="var(--fg)">NEW RULE: at most 10 copies of one title</text>
    </g>
    <g data-cue="before">
      <text x="20" y="64" fill="var(--fg-muted)">BEFORE: every door checks</text>
      <rect x="20" y="76" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="97" fill="var(--fg)">product page: edit</text>
      <rect x="20" y="118" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="139" fill="var(--fg)">cart page: edit</text>
      <rect x="20" y="160" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="181" fill="var(--fg)">reorder: edit (forgotten)</text>
      <rect x="20" y="202" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="223" fill="var(--fg)">mobile API: edit</text>
    </g>
    <g data-cue="after">
      <text x="270" y="64" fill="var(--fg-muted)">AFTER: doors call the cart</text>
      <rect x="270" y="76" width="110" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="97" fill="var(--fg)">product page</text>
      <rect x="270" y="118" width="110" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="139" fill="var(--fg)">cart page</text>
      <rect x="270" y="160" width="110" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="181" fill="var(--fg)">reorder</text>
      <rect x="270" y="202" width="110" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="223" fill="var(--fg)">mobile API</text>
      <path d="M380 92 L416 92 M410 88 L416 92 L410 96 M380 134 L416 134 M410 130 L416 134 L410 138 M380 176 L416 176 M410 172 L416 176 L410 180 M380 218 L416 218 M410 214 L416 218 L410 222" fill="none" stroke="var(--primary)" stroke-width="2"/>
    </g>
    <g data-cue="door">
      <rect x="420" y="76" width="80" height="158" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="460" y="102" text-anchor="middle" fill="var(--fg)">Cart.add</text>
      <text x="460" y="122" text-anchor="middle" fill="var(--fg)">1 edit</text>
    </g>
  </g>
</svg>
```

```narrate
[[rule]] A new rule arrives: at most ten copies of one title. [[before]] On the left, every door checks for itself. The product page, the cart page, the reorder button and the mobile endpoint all need an edit, and one is easy to forget. [[after]] On the right, the doors only call the cart. [[door]] The cart checks once. One edit, in one place, and no door can skip it.
```

> **Why:** an invariant kept behind one door cannot be skipped. This is **encapsulation**: not "hiding data", but making the rules impossible to bypass.

## Money is a value, not a number

A price has a currency, counts whole cents, and must never change under you. Give it a small class: a **value object**.

- Cents are an integer: `1999`, never `19.99`
- Two values with the same cents and currency are **equal**
- It is **immutable**: `add` returns a new `Money`, the old one stays
- It is valid from birth, so a bad one cannot exist

```ts
constructor({ cents, currency }: { cents: number; currency: string }) {
  if (!Number.isSafeInteger(cents)) throw new DomainError("money needs whole cents");
  if (cents < 0) throw new DomainError("money cannot be negative");
  this.#cents = cents;
  this.#currency = currency;
}
```

```narrate
A price is more than a number. It has a currency and it counts whole cents. So we give it a small class, called a value object. Two values with the same cents and currency are equal. It never changes after it is created: adding returns a new one. And it refuses nonsense, like half a cent, or adding dollars to euros.
```

> **Not this:** floats rounded with `toFixed(2)` at the end. The error hides inside every addition, and every screen must remember to round. Integer cents are exact.

```quiz
q: Which statement describes a value object?
options:
  - two with the same contents are the same object in memory
  - equal contents mean equal, and add returns a new one without touching the old
  - it has a setter for cents, so a wrong price can be fixed
answer: 1
why: A value object is defined by its contents, not by identity, and it never changes. To get a different value you build a new one.
```

## When it is overkill

Encapsulation is about rules, not about getters.

> **Trap:** `getQuantity()` and `setQuantity()` that only read and write the field. That is the same bag of numbers with more typing. Fowler calls objects with data and no behavior **anemic**. Put the rule inside the method.

> **Trap:** a class for every string and number. Make a value object when the value has rules (money, quantity, email). A label shown on screen needs none.

A throwaway script, or a JSON response you only pass along, can stay plain data.

```quiz
q: Cart has setQuantity(isbn, n) that does line.quantity = n. What is wrong?
options:
  - nothing, it is a setter so it is encapsulated
  - it has no rule, so a negative quantity still gets in
  - setters are not allowed in TypeScript
answer: 1
why: Encapsulation only helps if the method enforces the invariant. A setter that accepts anything is a public field in disguise.
```

```narrate
Encapsulation is not about getters and setters. A setter that writes any value without checking is the same bag of numbers, just with more typing. Fowler calls objects that are all data and no behavior anemic. And do not wrap every string in a class. Use a value object when the value has rules, like money or a quantity. A label on a screen needs none.
```

## Say it in the interview

The interviewer is testing whether you know **why** encapsulation exists, not whether you can recite "hide the data".

| Say | It means |
|---|---|
| encapsulation | state is private, the rules live next to it |
| invariant | a fact that must always be true, like quantity 1 to 10 |
| value object | no identity, equal by value, immutable (`Money`) |
| entity | has identity and changes over time (`Cart`) |
| tell, don't ask | send a command, let the object decide |

> **Say it:** "I made Money a value object with integer cents, so float rounding bugs cannot happen. I made Cart own its rules, so no caller can put it in an invalid state."

```narrate
The interviewer wants to hear why, not the definition. Say: I made Money a value object with integer cents, so float rounding bugs cannot happen. I made the cart own its rules, so no caller can put it in an invalid state. Then use the words: encapsulation, invariant, value object, and entity for things like the cart that have an identity and change over time.
```

## Your turn

Open `money.ts` and `cart.ts`. They work, but they leak. Make the tests pass **without changing what callers can do**.

`Money`:

- Whole safe integer cents, never negative, currency is three capital letters. Anything else throws `DomainError`
- `add`, `subtract`, `multiply` return a new `Money`. Different currencies throw. `subtract` below zero throws. `multiply` takes a whole number of zero or more
- `equals` compares cents and currency. Nobody can edit a `Money` after it exists

`Cart`:

- Quantity is a whole number from 1 to 10, also after merging the same isbn. Wrong input throws `DomainError` and changes nothing
- `lines` returns a snapshot, and `add` keeps its own copy
- Unknown isbn in `remove` or `changeQuantity` throws. A price in another currency throws

Run `pnpm lesson test oop/01-model-the-domain`.

```hint
Turn the public fields of Money into `readonly #cents` and `readonly #currency`, set only in the constructor, and add getters. Then every method that changes something returns `new Money(...)`.
```

```hint
Put all the checks in the Money constructor. `add`, `subtract` and `multiply` then only call it, so a bad Money can never be made, not even by arithmetic.
```

```hint
In Cart, make `lines` a `#lines` Map keyed by isbn. One small function `requireValidQuantity(quantity)` throws `DomainError`, and every method that sets a quantity calls it.
```

```hint
For merging, check the incoming quantity first, then check existing plus incoming. Return copies from the `lines` getter with `{ ...line }`, and store a copy in `add`.
```
