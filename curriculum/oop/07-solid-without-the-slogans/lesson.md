---
title: SOLID without the slogans
lang: ts
minutes: 35
level: junior
roles: [backend, ai]
files: [collaborators.ts, orderService.ts]
sources:
  - https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html
  - https://en.wikipedia.org/wiki/SOLID
  - https://refactoring.guru/smells/divergent-change
  - https://refactoring.guru/smells/refused-bequest
  - https://martinfowler.com/bliki/RoleInterface.html
  - https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction
---

## One class, five bosses

The bookstore's `OrderService.placeOrder` is one method with five jobs. Each job has an owner, and each owner sends change requests.

| Request | Who asks | Where you edit |
|---|---|---|
| Friday discount | marketing | the pricing `if` chain inside `placeOrder` |
| New payment provider | finance | the charge call inside `placeOrder` |
| Warmer receipt text | support | the email block inside `placeOrder` |

Every request lands in the same method. Each edit can break the other four jobs, and a test for one job drags in all five.

```svg One method, five jobs, five people who send change requests
<svg viewBox="0 0 520 256" role="img" aria-label="placeOrder with five stacked jobs and an owner for each">
  <g font-family="var(--font-mono)" font-size="13">
    <rect x="160" y="6" width="350" height="246" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="172" y="26" fill="var(--fg-muted)">OrderService.placeOrder</text>
    <g data-cue="validate">
      <rect x="172" y="38" width="326" height="34" fill="var(--primary-container)" stroke="var(--cat-1)" stroke-width="2"/>
      <text x="184" y="60" fill="var(--fg)">1 validate the request</text>
      <text x="14" y="60" fill="var(--fg-muted)">product</text>
      <path d="M84 56 L170 56" stroke="var(--cat-1)" stroke-width="2"/>
    </g>
    <g data-cue="price">
      <rect x="172" y="80" width="326" height="34" fill="var(--primary-container)" stroke="var(--cat-2)" stroke-width="2"/>
      <text x="184" y="102" fill="var(--fg)">2 price it, apply discounts</text>
      <text x="14" y="102" fill="var(--fg-muted)">marketing</text>
      <path d="M96 98 L170 98" stroke="var(--cat-2)" stroke-width="2"/>
    </g>
    <g data-cue="charge">
      <rect x="172" y="122" width="326" height="34" fill="var(--primary-container)" stroke="var(--cat-3)" stroke-width="2"/>
      <text x="184" y="144" fill="var(--fg)">3 charge the card</text>
      <text x="14" y="144" fill="var(--fg-muted)">finance</text>
      <path d="M78 140 L170 140" stroke="var(--cat-3)" stroke-width="2"/>
    </g>
    <g data-cue="save">
      <rect x="172" y="164" width="326" height="34" fill="var(--primary-container)" stroke="var(--cat-4)" stroke-width="2"/>
      <text x="184" y="186" fill="var(--fg)">4 save the order</text>
      <text x="14" y="186" fill="var(--fg-muted)">operations</text>
      <path d="M100 182 L170 182" stroke="var(--cat-4)" stroke-width="2"/>
    </g>
    <g data-cue="email">
      <rect x="172" y="206" width="326" height="34" fill="var(--primary-container)" stroke="var(--cat-5)" stroke-width="2"/>
      <text x="184" y="228" fill="var(--fg)">5 email the receipt</text>
      <text x="14" y="228" fill="var(--fg-muted)">support</text>
      <path d="M78 224 L170 224" stroke="var(--cat-5)" stroke-width="2"/>
    </g>
  </g>
</svg>
```

```narrate
Here is one class with one long method. [[validate]] First it checks the request. [[price]] Then it works out the price and the discounts. [[charge]] Then it charges the card. [[save]] Then it saves the order. [[email]] Last, it sends a receipt. Five jobs, five different people who ask for changes, and all of them edit the same method.
```

> **Why:** SOLID is five names for pains you feel in a class like this one. Feel the pain first, learn the name second.

## S: split by who asks for the change

Robert Martin: gather the things that change for the same reason, and separate the things that change for different reasons. The test is not size. Ask **who asks for this to change?**

Each answer becomes a collaborator behind a small interface. `placeOrder` shrinks to a conductor that calls them in order.

```svg The conductor calls five collaborators, each owned by one kind of change request
<svg viewBox="0 0 520 220" role="img" aria-label="A conductor box with five collaborator boxes under it">
  <g font-family="var(--font-mono)" font-size="10" text-anchor="middle">
    <g data-cue="conductor">
      <rect x="150" y="10" width="220" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="32" fill="var(--fg)" font-size="14">placeOrder</text>
      <text x="260" y="50" fill="var(--fg-muted)" font-size="11">only the order of steps</text>
    </g>
    <g data-cue="parts">
      <path d="M260 60 L55 110 M260 60 L159 110 M260 60 L263 110 M260 60 L367 110 M260 60 L471 110" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <rect x="6" y="110" width="98" height="64" fill="var(--surface-2)" stroke="var(--cat-1)" stroke-width="2"/>
      <text x="55" y="136" fill="var(--fg)">OrderValidator</text>
      <text x="55" y="158" fill="var(--fg-muted)">product</text>
      <rect x="110" y="110" width="98" height="64" fill="var(--surface-2)" stroke="var(--cat-2)" stroke-width="2"/>
      <text x="159" y="136" fill="var(--fg)">PriceCalculator</text>
      <text x="159" y="158" fill="var(--fg-muted)">marketing</text>
      <rect x="214" y="110" width="98" height="64" fill="var(--surface-2)" stroke="var(--cat-3)" stroke-width="2"/>
      <text x="263" y="136" fill="var(--fg)">PaymentGateway</text>
      <text x="263" y="158" fill="var(--fg-muted)">finance</text>
      <rect x="318" y="110" width="98" height="64" fill="var(--surface-2)" stroke="var(--cat-4)" stroke-width="2"/>
      <text x="367" y="136" fill="var(--fg)">OrderSaver</text>
      <text x="367" y="158" fill="var(--fg-muted)">operations</text>
      <rect x="422" y="110" width="98" height="64" fill="var(--surface-2)" stroke="var(--cat-5)" stroke-width="2"/>
      <text x="471" y="136" fill="var(--fg)">ReceiptSender</text>
      <text x="471" y="158" fill="var(--fg-muted)">support</text>
    </g>
  </g>
</svg>
```

```narrate
Now the split. [[conductor]] The method that was doing everything keeps only one job: calling the steps in the right order. [[parts]] Each step moves into its own small part, and each part answers to one kind of change request. Finance changes the gateway. Marketing changes the calculator. Nobody edits the conductor.
```

> **Not this:** split by size, such as "every method over 20 lines moves to `OrderHelper`". You get a helper with five reasons to change inside.

> **Trap:** two jobs that always change together may stay together. One-method classes are not the goal.

## O: add a rule without editing

Marketing wants a Friday discount. In the god class you open `placeOrder` and add another `if`, in code that already has tests.

Make each discount a `PricingRule` object. The calculator loops over a list of them. Friday becomes one new object in that list, and no old line changes.

```ts
export type PricingRule = { name: string; discountCents: (request: OrderRequest) => number };

createPriceCalculator({ rules: [bulkRule, welcomeCouponRule, fridayRule] });
```

```svg Left: a new discount edits the old method. Right: a new discount is one more object in a list
<svg viewBox="0 0 520 210" role="img" aria-label="Edit an if chain versus add a rule object">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="before">
      <rect x="10" y="10" width="240" height="190" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="22" y="32" fill="var(--fg)" font-size="14">BEFORE: edit</text>
      <text x="22" y="62" fill="var(--fg-muted)">if (bulk) ...</text>
      <text x="22" y="86" fill="var(--fg-muted)">if (coupon) ...</text>
      <rect x="18" y="98" width="224" height="26" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="26" y="116" fill="var(--fg)">if (friday) ...  new edit</text>
      <text x="22" y="156" fill="var(--fg-muted)">old code reopened,</text>
      <text x="22" y="176" fill="var(--fg-muted)">old tests at risk</text>
    </g>
    <g data-cue="after">
      <rect x="270" y="10" width="240" height="190" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="282" y="32" fill="var(--fg)" font-size="14">AFTER: add</text>
      <text x="282" y="60" fill="var(--fg-muted)">rules = [</text>
      <text x="298" y="82" fill="var(--fg-muted)">bulk,</text>
      <text x="298" y="102" fill="var(--fg-muted)">coupon,</text>
      <rect x="290" y="112" width="210" height="26" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
      <text x="298" y="130" fill="var(--fg)">friday  new object</text>
      <text x="282" y="158" fill="var(--fg-muted)">]</text>
      <text x="282" y="184" fill="var(--fg-muted)">nothing old touched</text>
    </g>
  </g>
</svg>
```

```narrate
Compare the two. [[before]] On the left, a new discount means reopening the method and adding another if. The old code and its tests are now at risk. [[after]] On the right, the calculator loops over a list of rules. Friday is one new object in that list. The old code is untouched, so it cannot break. That is open for extension, closed for modification.
```

> **Not this:** `discountType: "bulk" | "coupon"` plus a `switch`. Every new type reopens the switch.

> **Trap:** the first discount needs no interface. Extract the rule when the second arrives, once you can see what really varies. Sandi Metz: duplication is cheaper than the wrong abstraction.

## L: the subclass that throws

Support says rush orders need no receipt. A quick fix: `class RushOrderService extends OrderService`, with `sendReceipt` overridden to `throw new Error("no receipts")`.

But `placeOrder` still calls it. The card is charged, the order is saved, then the call crashes. The caller retries, and the customer pays twice.

Liskov: code written for the base type must keep working with any substitute. Refactoring Guru calls this smell Refused Bequest: methods "redefined to throw exceptions".

The fix is a collaborator, not a smarter subclass. `NoReceiptSender` keeps the promise "send resolves" and sends nothing.

```svg Left: the subclass breaks the caller. Right: a substitute that keeps the promise
<svg viewBox="0 0 520 220" role="img" aria-label="A throwing subclass versus a no-op substitute behind an interface">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="broken">
      <rect x="10" y="10" width="240" height="200" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="130" y="32" fill="var(--fg)" font-size="14">SUBCLASS THROWS</text>
      <rect x="40" y="50" width="180" height="32" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="130" y="71" fill="var(--fg)">OrderService</text>
      <path d="M130 82 L130 112" stroke="var(--fg-muted)" stroke-width="2"/>
      <rect x="40" y="112" width="180" height="32" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="130" y="133" fill="var(--fg)">RushOrderService</text>
      <text x="130" y="170" fill="var(--danger)">sendReceipt() throws</text>
      <text x="130" y="192" fill="var(--fg-muted)">paid, saved, then crash</text>
    </g>
    <g data-cue="fixed">
      <rect x="270" y="10" width="240" height="200" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="390" y="32" fill="var(--fg)" font-size="14">SAME PROMISE</text>
      <rect x="320" y="50" width="140" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="390" y="71" fill="var(--fg)">ReceiptSender</text>
      <path d="M350 112 L370 82 M430 112 L410 82" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <rect x="280" y="112" width="104" height="32" fill="var(--surface-3)" stroke="var(--ok)" stroke-width="2"/>
      <text x="332" y="133" fill="var(--fg)">EmailSender</text>
      <rect x="394" y="112" width="106" height="32" fill="var(--surface-3)" stroke="var(--ok)" stroke-width="2"/>
      <text x="447" y="133" fill="var(--fg)">NoReceipt</text>
      <text x="390" y="170" fill="var(--ok)">both resolve</text>
      <text x="390" y="192" fill="var(--fg-muted)">callers cannot tell</text>
    </g>
  </g>
</svg>
```

```narrate
[[broken]] On the left, the subclass overrides send receipt to throw. The caller holds the base type and knows nothing about this surprise, so the order is paid and saved, and then the call crashes. [[fixed]] On the right, both senders keep the same promise: they resolve. One sends mail, one does nothing. The caller cannot tell them apart, and that is what substitutable means.
```

```quiz
q: Which override breaks Liskov substitution?
options:
  - it returns a cached value faster than the base class
  - it throws "not supported" for a method the base class promises works
  - it logs a line, then calls the base method
answer: 1
why: Callers rely on the base type's promise. A throw they never expected turns their correct code into a crash.
```

> **Not this:** `if (service instanceof RushOrderService)` in the caller. It brings back the type check that substitution should remove.

## I: small role interfaces

The first order repository has `save`, `findById`, `listAll` and `deleteAll`. Checkout only calls `save`.

Now every test fake implements four methods, and a new `NullStore` must decide what `deleteAll` means.

Give each client the small interface it actually uses: `OrderSaver` for checkout, `OrderFinder` for the support screen. One database class can implement both. Fowler calls these **role interfaces**. A header interface "forces you to implement every method, even if you're not going to need them".

```svg Left: three clients share one fat interface. Right: each client sees only its own role
<svg viewBox="0 0 520 220" role="img" aria-label="One fat interface versus three role interfaces">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="fat">
      <rect x="10" y="10" width="240" height="200" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="22" y="32" fill="var(--fg)" font-size="14">ONE FAT INTERFACE</text>
      <rect x="130" y="48" width="108" height="100" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="140" y="70" fill="var(--fg)">save</text>
      <text x="140" y="92" fill="var(--fg)">findById</text>
      <text x="140" y="114" fill="var(--fg)">listAll</text>
      <text x="140" y="136" fill="var(--fg)">deleteAll</text>
      <text x="22" y="70" fill="var(--fg-muted)">checkout</text>
      <text x="22" y="108" fill="var(--fg-muted)">support</text>
      <text x="22" y="146" fill="var(--fg-muted)">cleanup</text>
      <path d="M80 66 L128 66 M80 104 L128 90 M80 142 L128 134" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <text x="22" y="186" fill="var(--fg-muted)">fakes pay for all four</text>
    </g>
    <g data-cue="roles">
      <rect x="270" y="10" width="240" height="200" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="282" y="32" fill="var(--fg)" font-size="14">THREE ROLES</text>
      <text x="282" y="68" fill="var(--fg-muted)">checkout</text>
      <path d="M350 64 L388 64" stroke="var(--primary)" stroke-width="2"/>
      <rect x="390" y="48" width="112" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="400" y="67" fill="var(--fg)">OrderSaver</text>
      <text x="282" y="108" fill="var(--fg-muted)">support</text>
      <path d="M342 104 L388 104" stroke="var(--primary)" stroke-width="2"/>
      <rect x="390" y="88" width="112" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="400" y="107" fill="var(--fg)">OrderFinder</text>
      <text x="282" y="148" fill="var(--fg-muted)">cleanup</text>
      <path d="M342 144 L388 144" stroke="var(--primary)" stroke-width="2"/>
      <rect x="390" y="128" width="112" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="400" y="147" fill="var(--fg)">OrderPurger</text>
      <text x="282" y="186" fill="var(--fg-muted)">a fake has one method</text>
    </g>
  </g>
</svg>
```

```narrate
[[fat]] On the left, three clients share one fat interface with four methods. Checkout needs one of them, yet every fake and every new implementation has to provide all four. [[roles]] On the right, each client sees only the role it uses. A test fake for checkout has exactly one method, and it cannot be broken by changes to the other roles.
```

> **Trap:** one interface per class, by reflex, is noise. Fowler: use interfaces "only when you really need substitutability".

## D: depend on abstractions

`placeOrder` calls `new SmtpMailer(...)` and a payment URL directly. A test now needs a mail server and a network.

Flip the arrow. The service owns a small interface, `ReceiptSender`, and depends only on that. The real mailer, a test fake and `NoReceiptSender` all point at it. One startup file, the **composition root**, picks the concrete classes.

```svg Left: policy points at a detail. Right: policy and detail both point at an interface
<svg viewBox="0 0 520 210" role="img" aria-label="Direct dependency versus dependency on an interface">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="direct">
      <rect x="10" y="10" width="240" height="190" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="130" y="32" fill="var(--fg)" font-size="14">DIRECT</text>
      <rect x="50" y="50" width="160" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="130" y="71" fill="var(--fg)">placeOrder</text>
      <path d="M130 82 L130 120 M124 112 L130 120 L136 112" fill="none" stroke="var(--danger)" stroke-width="2"/>
      <rect x="50" y="122" width="160" height="32" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="130" y="143" fill="var(--fg)">new SmtpMailer()</text>
      <text x="130" y="182" fill="var(--fg-muted)">tests need a real server</text>
    </g>
    <g data-cue="inverted">
      <rect x="270" y="10" width="240" height="190" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="390" y="32" fill="var(--fg)" font-size="14">INVERTED</text>
      <rect x="310" y="50" width="160" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="390" y="71" fill="var(--fg)">placeOrder</text>
      <path d="M390 82 L390 100 M384 92 L390 100 L396 92" fill="none" stroke="var(--ok)" stroke-width="2"/>
      <rect x="310" y="100" width="160" height="30" fill="var(--surface-3)" stroke="var(--ok)" stroke-width="2"/>
      <text x="390" y="120" fill="var(--fg)">ReceiptSender</text>
      <path d="M338 160 L352 134 M444 160 L430 134" fill="none" stroke="var(--ok)" stroke-width="2"/>
      <text x="338" y="178" fill="var(--fg)">Smtp</text>
      <text x="444" y="178" fill="var(--fg)">Fake</text>
    </g>
  </g>
</svg>
```

```narrate
[[direct]] On the left, the order logic reaches straight for a concrete mailer. To test it, you need a real mail server. [[inverted]] On the right, the order logic depends on a small interface that it owns. The real mailer and the test fake both plug into that interface. The arrows now point toward the abstraction, and the choice of concrete class moves to one place at startup.
```

> **Why:** the policy, "charge, save, send a receipt", stops depending on a detail, "which mail library". Details become swappable and testable.

> **Not this:** an interface for every class "just in case". Add the seam where a second implementation exists. A test fake counts as one.

## What to say in the interview

"Explain SOLID" checks whether the letters connect to real code. Do not recite them. Tell one story.

| Letter | The pain in `OrderService` | The move |
|---|---|---|
| S | five owners edit one method | split by who asks |
| O | each discount reopens an `if` | rules in a list |
| L | a subclass throws after payment | substitutes keep the promise |
| I | fakes carry unused methods | one small role each |
| D | tests need a mail server | depend on an interface |

> **Say it out loud:** "I had one class that changed for five reasons, so I split it by who asks for the change. New rules became new objects instead of edits. Callers hold a small interface, and the concrete choice happens once, at startup."

```narrate
Do not recite the five letters. Tell one story. I had a class that changed for five reasons, so I split it by who asks for the change. New rules became new objects instead of edits. Substitutes keep the promise of the type they replace. Callers hold small interfaces, and the concrete choice happens once, at startup. Then name which letter each sentence was.
```

```quiz
q: A teammate says "open for extension, closed for modification". Which change matches it?
options:
  - add a new if branch to placeOrder for the Friday discount
  - add a new rule object to the list the calculator already loops over
  - make placeOrder longer so it handles every future discount
answer: 1
why: The calculator and its tests stay untouched. The new behavior arrives as new code.
```

## Your turn

Open `orderService.ts`. It holds the god class. Split it.

- `collaborators.ts`: fill the five factories by moving logic out of `OrderService`
- `orderService.ts`: replace the class with `createOrderService(dependencies)`, a conductor that only calls the collaborators
- `contracts.ts`: the given interfaces. Read it, do not edit it

`createNoReceiptSender` currently throws. Fix it so it keeps the promise.

The tests also plug in rules, senders and gateways **written inside the test**. They must work with no edit to your code.

Run `pnpm lesson test oop/07-solid-without-the-slogans`.

```hint
Copy each job out of `placeOrder` into the matching factory in `collaborators.ts`. Keep the exact problem messages the god class uses.
```

```hint
`createPriceCalculator({ rules })` sums `rule.discountCents(request)` over the list, caps the discount at the subtotal, and returns subtotal, discount and total.
```

```hint
`createOrderService` takes the six dependencies and does: validate, price, charge, save, send. Return early for rejected and declined. It must not mention bulk, coupons, email or SMTP.
```

```hint
`createNoReceiptSender` returns `{ send: async () => {} }`. That is a valid substitute because `send` still resolves.
```
