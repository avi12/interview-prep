---
title: Depend on interfaces
lang: ts
minutes: 30
level: junior
roles: [backend, ai]
files: [checkout.ts, fakes.ts]
sources:
  - https://martinfowler.com/articles/injection.html
  - https://en.wikipedia.org/wiki/Dependency_inversion_principle
  - https://martinfowler.com/eaaCatalog/repository.html
  - https://martinfowler.com/bliki/TestDouble.html
---

## Checkout builds its own tools

`Checkout` must charge a card, save the order and send an email. The quick way is to build each tool right where it is used.

```ts
class Checkout {
  async placeOrder({ customerEmail, lines, paymentToken }: PlaceOrderInput) {
    const gateway = new StripeGateway(process.env.STRIPE_KEY);
    const orders = new PostgresOrders(process.env.DATABASE_URL);
    const mailer = new SmtpMailer(process.env.SMTP_URL);
    const charge = await gateway.charge({ amount: totalOf(lines), paymentToken });
    await orders.save(toOrder(charge, lines));
    await mailer.send(confirmationFor(customerEmail));
  }
}
```

To test this you need a Stripe key, a database and a mail server. Run the test twice and you charge a card twice. So nobody writes the test.

```narrate
Checkout has to charge a card, save the order and send an email. The quick way is to build each tool right where it is used. Now look at what a test needs: a payment key, a real database and a mail server. Run the test twice and you charge a card twice. So in practice nobody writes the test.
```

## Switch the provider

Finance says: use PayPal for EU customers. Search for the Stripe class:

```
checkout.ts        new StripeGateway(...)
refundService.ts   new StripeGateway(...)
nightlyJob.ts      new StripeGateway(...)
```

Each one builds its own, so each one is edited, and each test still needs the network. `Checkout` is **tightly coupled** to Stripe: it names the concrete class.

```narrate
Finance asks to use PayPal for customers in Europe. Search the code for the Stripe class and you find it built in checkout, in the refund service and in the nightly job. Each one builds its own, so each one has to be edited, and every test still needs the network. Checkout is tightly coupled to Stripe because it names the concrete class.
```

## Ask for what you need

A class should say what it needs, not go and get it. Declare each need as an `interface`, take them in the constructor, and let one place decide what to plug in. That is **dependency injection**.

The interfaces belong to `Checkout`, not to Stripe. The adapter conforms to the checkout's terms. That reversal is the *inversion* in the Dependency Inversion Principle. The one file that builds everything is the **composition root**.

```ts
export class Checkout {
  readonly #gateway: PaymentGateway;
  readonly #orders: OrderRepository;

  constructor({ gateway, orders, mailer, newId }: CheckoutDependencies) {
    this.#gateway = gateway;
    this.#orders = orders;
  }
}

const checkout = new Checkout({
  gateway: new StripeGateway(process.env.STRIPE_KEY),
  orders: new PostgresOrders(process.env.DATABASE_URL),
  mailer: new SmtpMailer(process.env.SMTP_URL),
  newId: () => crypto.randomUUID()
});
```

```svg Switching provider: three edits and live tests before, one new class and one wiring line after
<svg viewBox="0 0 520 250" role="img" aria-label="Change radius of switching payment provider, before and after">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="req">
      <rect x="20" y="8" width="480" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="28" text-anchor="middle" fill="var(--fg)">NEW: switch to PayPal, test without real charges</text>
    </g>
    <g data-cue="before">
      <text x="20" y="64" fill="var(--fg-muted)">BEFORE: every class builds Stripe</text>
      <rect x="20" y="76" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="97" fill="var(--fg)">Checkout: edit</text>
      <rect x="20" y="118" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="139" fill="var(--fg)">RefundService: edit</text>
      <rect x="20" y="160" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="181" fill="var(--fg)">NightlyJob: edit</text>
      <rect x="20" y="202" width="210" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="32" y="223" fill="var(--fg)">tests: need a live Stripe</text>
    </g>
    <g data-cue="callers">
      <text x="270" y="64" fill="var(--fg-muted)">AFTER: depend on an interface</text>
      <rect x="270" y="76" width="230" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="97" text-anchor="middle" fill="var(--fg)">Checkout + others: untouched</text>
      <path d="M385 108 L385 118 M381 113 L385 118 L389 113" fill="none" stroke="var(--primary)" stroke-width="2"/>
      <rect x="270" y="118" width="230" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="139" text-anchor="middle" fill="var(--fg)">interface PaymentGateway</text>
      <rect x="388" y="202" width="112" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="444" y="223" text-anchor="middle" fill="var(--fg)" font-size="11">StripeGateway</text>
    </g>
    <g data-cue="new">
      <rect x="270" y="160" width="112" height="32" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="3"/>
      <text x="326" y="181" text-anchor="middle" fill="var(--fg)" font-size="11">PayPal: new</text>
    </g>
    <g data-cue="root">
      <rect x="388" y="160" width="112" height="32" fill="var(--surface-2)" stroke="var(--accent-2)" stroke-width="3"/>
      <text x="444" y="181" text-anchor="middle" fill="var(--fg)" font-size="11">main.ts: 1 line</text>
    </g>
    <g data-cue="spy">
      <rect x="270" y="202" width="112" height="32" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="3"/>
      <text x="326" y="223" text-anchor="middle" fill="var(--fg)" font-size="11">Spy: tests</text>
    </g>
  </g>
</svg>
```

```narrate
[[req]] Two asks arrive: switch to PayPal, and test without real charges. [[before]] On the left, every class builds Stripe itself, so each one is edited and the tests need a live account. [[callers]] On the right, checkout and the others only know the payment gateway interface, and the Stripe adapter stays as it is. [[new]] PayPal is one new class. [[root]] The only edit is one line in main, where the parts are wired together. [[spy]] And in tests a spy gateway takes its place, so no card is charged.
```

> **Why:** with `new` inside, a class both chooses and uses its tools. With injection it only uses them, so a new provider or a test double is a wiring change, not a code change.

```quiz
q: Where should new StripeGateway(...) appear?
options:
  - inside Checkout.placeOrder, next to where it is used
  - in the composition root only, the one place that wires everything
  - in every class that needs to charge a card
answer: 1
why: Only the wiring decides which implementation is used. Every other class receives whatever it is given and works with any of them.
```

## Fakes make it testable

In a test you plug in **doubles**, from the testing track. Checkout cannot tell the difference.

| Double | Here | Why |
|---|---|---|
| fake | `InMemoryOrderRepository` | really works, in memory |
| spy | `RecordingMailer`, `SpyGateway` | records calls to outgoing effects |
| stub | `DecliningGateway` | canned answer, creates a hard case |

Prefer checking **state** in the fake: is the order saved? Use a spy only for effects you cannot look at afterwards: the charge and the email.

```narrate
In a test you plug in doubles, the same ones from the testing track. The in memory order repository is a fake: it really works, just in memory. The recording mailer and the spy gateway are spies: they remember how they were called. A gateway that always declines is a stub, a canned answer for a hard case. Checkout cannot tell the difference. Prefer checking state in the fake, and use a spy for effects you cannot look at afterwards.
```

## Choose your fights

> **Not this:** a global `Services.gateway` or a service locator. The constructor no longer shows what `Checkout` needs, tests must set global state, and two tests can fight over it.

> **Trap:** an interface in front of everything. `Money` and pure functions need no interface and no fake. Cut only at boundaries that are slow or unpredictable: network, database, clock, randomness. You also do not need a DI framework. Plain constructor arguments and one `main.ts` are enough.

Fowler's advice: start with **constructor injection**, because it builds a valid object in one step.

```quiz
q: Which dependency is worth hiding behind an interface?
options:
  - the Money class, used in every calculation
  - the payment gateway, which calls the network
  - a function that adds two numbers
answer: 1
why: Interfaces earn their place at slow or unpredictable boundaries. Pure code is already easy to test with real values.
```

```narrate
Choose your fights. Do not reach for a global services object or a service locator, because then the constructor no longer shows what a class needs and tests fight over shared state. And do not put an interface in front of everything. Money and plain functions need none. Cut at the boundaries that are slow or unpredictable: the network, the database, the clock, randomness. Plain constructor arguments and one wiring file are enough.
```

## Say it in the interview

| Say | It means |
|---|---|
| dependency injection | a class receives its collaborators instead of building them |
| inversion of control | the caller, not the class, decides what is used |
| Dependency Inversion Principle | depend on abstractions that the high-level code owns (the D in SOLID) |
| repository | a collection-like interface to stored domain objects |
| composition root | the one place that wires real classes together |
| test double | fake, stub, spy or mock standing in for a real part |

> **Say it:** "Checkout depends on small interfaces it owns. The real Stripe, Postgres and SMTP classes are plugged in at the edge. That is why I can test the whole checkout in memory, and why a new provider is one new class."

```narrate
Interviewers ask about the D in SOLID. Say: checkout depends on small interfaces it owns. The real payment, database and mail classes are plugged in at the edge. That is why I can test the whole checkout in memory, and why a new provider is one new class. Then use the words: dependency injection, inversion of control, repository, composition root, and test double.
```

## Your turn

`ports.ts` has the interfaces. `Money`, `DomainError`, `Mailer` and `OrderLine` are given in `curriculum/_kit/bookstore/`. Open `checkout.ts` and `fakes.ts`.

`Checkout({ gateway, orders, mailer, newId })` with `placeOrder({ customerEmail, lines, paymentToken })`:

- No lines: throw `DomainError`, never call the gateway
- Charge the gateway once with the order total
- Declined: return `{ status: "declined", reason }`, save and email nothing
- Approved: save a `PlacedOrder` (id from `newId`, the gateway's `transactionId`), **then** email `{ to, subject: "Order <id> confirmed", body }` with the total in the body, and return `{ status: "placed", orderId }`

`fakes.ts`: `InMemoryOrderRepository` (`save`, `findById`, `list`, one row per id) and `RecordingMailer` (`sent` list).

The tests bring their own gateways, repositories and mailers. If `Checkout` builds one itself, it fails.

Run `pnpm lesson test oop/04-depend-on-interfaces`.

```hint
Store the four dependencies in private fields in the constructor. Nothing in `Checkout` should say `new` for a gateway, repository or mailer.
```

```hint
Order matters: validate, charge, return early on `declined`, then save, then email. A crash in any step must stop the later ones.
```

```hint
`ChargeResult` is a discriminated union. After `if (charge.status === "declined") return ...`, TypeScript knows `charge.transactionId` exists.
```

```hint
The fake repository is a `Map` from id to order. The recording mailer pushes each message onto its `sent` array.
```
