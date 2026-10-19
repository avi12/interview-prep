---
title: Composition over inheritance
lang: ts
minutes: 25
level: junior
roles: [backend, ai]
files: [notifier.ts]
sources:
  - https://en.wikipedia.org/wiki/Composition_over_inheritance
  - https://en.wikipedia.org/wiki/Fragile_base_class
  - https://refactoring.guru/design-patterns/bridge
  - https://refactoring.guru/design-patterns/strategy
  - https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction
---

## A class per combination

Customers must hear about their orders. Notices go out by email or SMS, and they come in two styles: **urgent** (shouting) and **digest** (one summary). The first design uses inheritance:

```ts
class Notifier {
  notify(message: string) { this.deliver(message); }
  deliver(message: string) { throw new Error("subclass must implement"); }
}

class EmailNotifier extends Notifier { deliver(message: string) { smtp.send(message); } }
class SmsNotifier extends Notifier { deliver(message: string) { sms.send(message.slice(0, 160)); } }

class UrgentEmailNotifier extends EmailNotifier { notify(message: string) { super.notify(message.toUpperCase()); } }
class UrgentSmsNotifier extends SmsNotifier { notify(message: string) { super.notify(message.toUpperCase()); } }
```

Two things vary, **where** it goes and **how** it reads. Every combination is a class, and the urgent logic is copied into each one.

```narrate
Customers must hear about their orders, by email or by text message, in an urgent style or as a digest. The first design makes a subclass for every combination. Urgent email, urgent text, digest email, digest text. Two things vary, where the message goes and how it reads, and the urgent logic is copied into every class.
```

## A new channel arrives

Add Slack. That is not one class but three: Slack, urgent Slack, digest Slack. A weekly style next month adds three more.

Worse, subclasses depend on how the parent calls itself:

```ts
class Notifier {
  notify(message: string) { this.notifyAll([message]); }
  notifyAll(messages: string[]) { this.deliver(messages.join("\n")); }
}

class DigestEmailNotifier extends EmailNotifier {
  notifyAll(messages: string[]) { this.notify(`Digest:\n${messages.join("\n")}`); }
}
```

The base change is fine on its own. Now `DigestEmailNotifier` calls itself forever. This is the **fragile base class** problem.

```narrate
Now add Slack. That is not one class, it is three, and a weekly style next month adds three more. The worse problem is hidden. Someone makes a harmless change in the parent, so notify calls notify all. The digest subclass, which calls notify from inside notify all, now calls itself forever. A subclass depends on how its parent calls itself, and that is called the fragile base class problem.
```

## Two small parts

Pull the two things that vary into their own small types. A **Channel** knows where a message goes. A **Formatter** knows how notices become text. A `Notifier` *has* one of each and only connects them.

```ts
export class Notifier {
  #channel: Channel;
  #formatter: Formatter;

  notify(notices: readonly Notice[]) {
    this.#channel.send(this.#formatter.format(notices));
  }
}
```

Either part can be swapped while the program runs: `notifier.useChannel(sms)`. The count grows by **adding**, not multiplying.

```svg Adding Slack: three new classes with inheritance, one with composition
<svg viewBox="0 0 520 230" role="img" aria-label="Class per combination versus two small parts">
  <g font-family="var(--font-mono)" font-size="11">
    <g data-cue="req">
      <rect x="20" y="8" width="480" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="28" text-anchor="middle" fill="var(--fg)">NEW CHANNEL: Slack</text>
    </g>
    <g data-cue="grid" font-size="10">
      <text x="20" y="64" fill="var(--fg-muted)">BEFORE: a class per combination</text>
      <rect x="20" y="76" width="72" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="56" y="96" text-anchor="middle" fill="var(--fg)">Email</text>
      <rect x="96" y="76" width="72" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="132" y="96" text-anchor="middle" fill="var(--fg)">Sms</text>
      <rect x="20" y="114" width="72" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="56" y="134" text-anchor="middle" fill="var(--fg)">UrgentEmail</text>
      <rect x="96" y="114" width="72" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="132" y="134" text-anchor="middle" fill="var(--fg)">UrgentSms</text>
      <rect x="20" y="152" width="72" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="56" y="172" text-anchor="middle" fill="var(--fg)">DigestEmail</text>
      <rect x="96" y="152" width="72" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="132" y="172" text-anchor="middle" fill="var(--fg)">DigestSms</text>
    </g>
    <g data-cue="newcells" font-size="10">
      <rect x="172" y="76" width="72" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="208" y="96" text-anchor="middle" fill="var(--fg)">Slack</text>
      <rect x="172" y="114" width="72" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="208" y="134" text-anchor="middle" fill="var(--fg)">UrgentSlack</text>
      <rect x="172" y="152" width="72" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="208" y="172" text-anchor="middle" fill="var(--fg)">DigestSlack</text>
      <text x="20" y="206" fill="var(--fg)">Slack = 3 new classes</text>
    </g>
    <g data-cue="parts">
      <text x="270" y="64" fill="var(--fg-muted)">AFTER: two small parts</text>
      <rect x="270" y="76" width="230" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="96" text-anchor="middle" fill="var(--fg)">Notifier(channel, formatter)</text>
      <rect x="270" y="120" width="72" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="306" y="138" text-anchor="middle" fill="var(--fg)">Email</text>
      <rect x="349" y="120" width="72" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="138" text-anchor="middle" fill="var(--fg)">Sms</text>
      <rect x="270" y="158" width="72" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="306" y="176" text-anchor="middle" fill="var(--fg)">Urgent</text>
      <rect x="349" y="158" width="72" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="385" y="176" text-anchor="middle" fill="var(--fg)">Digest</text>
    </g>
    <g data-cue="newpart">
      <rect x="428" y="120" width="72" height="28" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="3"/>
      <text x="464" y="138" text-anchor="middle" fill="var(--fg)">Slack</text>
      <text x="270" y="206" fill="var(--fg)">Slack = 1 new class</text>
    </g>
  </g>
</svg>
```

```narrate
[[req]] The new requirement is Slack. [[grid]] On the left, every channel and every style is a class of its own, six already. [[newcells]] Slack needs three more, and the urgent logic gets copied into each. [[parts]] On the right, a notifier just holds one channel and one formatter. [[newpart]] Slack is a single new channel class, and it works with every formatter that exists.
```

> **Why:** inheritance multiplies (channels times styles). Composition adds (channels plus styles). It also fixes fragility: the parts only talk through a small interface, so no part depends on how another calls itself.

## Choose your fights

> **Not this:** one `Notifier` with flags like `isUrgent`, `isDigest` and a `channel` string. That is the `if` chain from the last lesson again, now inside one class.

> **Trap:** inheritance is not evil. `OutOfStockError extends DomainError` is a true "is a" on one stable axis. And composition costs forwarding code. Do not invent Channel and Formatter before a second variation is real: Sandi Metz warns that the wrong abstraction costs more than duplication.

The Gang of Four put it as a default, not a law: **favor object composition over class inheritance**.

```quiz
q: Which case is a reasonable use of inheritance?
options:
  - two features that vary independently, mixed by subclassing
  - OutOfStockError extends DomainError, one stable kind-of relationship
  - reusing two methods from a class that is not really a parent
answer: 1
why: A real is-a relationship on a single stable axis is fine. Independent axes explode, and borrowing methods from a non-parent couples you to its insides.
```

```narrate
Choose your fights. Do not fix this with flags on one class, because that brings the if chain back. And inheritance is not evil. An out of stock error that extends a domain error is a true is a relationship on one stable axis. Composition costs some forwarding code, so wait until the second variation is real before you invent the parts. The Gang of Four wrote: favor object composition over class inheritance. It is a default, not a law.
```

## Say it in the interview

| Say | It means |
|---|---|
| composition over inheritance | build behavior by holding parts, not by extending a parent |
| has-a vs is-a | a Notifier has a Channel; it is not a kind of channel |
| class explosion | subclasses multiplying with each independent axis |
| fragile base class | a parent change that silently breaks a child |
| Bridge pattern | two dimensions vary independently, so give each its own hierarchy |

> **Say it:** "I used composition over inheritance because notifications vary in two independent ways, where they go and how they read. Subclasses would multiply with every new option. Two small parts add, and I can swap them at runtime."

```narrate
Interviewers love this question. Say: I used composition over inheritance because notifications vary in two independent ways, where they go and how they read. Subclasses would multiply with every new option. Two small parts add up, and I can swap them at runtime. The words to know are has a versus is a, class explosion, the fragile base class problem, and the Bridge pattern.
```

## Your turn

Open `notifier.ts`. The interfaces `Channel` and `Formatter` live in `parts.ts`, with `EmailChannel` and `SmsChannel` as examples. `Money` is given in `curriculum/_kit/bookstore/`. Write:

- `SlackChannel`: records `[slack] :package: ` plus the text in `sent`
- `UrgentFormatter`: each notice on its own line as `URGENT: ` plus its text in capitals
- `DigestFormatter`: a header `Digest (N):` then one `- text` line per notice
- `Notifier({ channel, formatter })` with `notify(notices)`, `useChannel` and `useFormatter`. One `send` per call, nothing for an empty list

The tests also bring a channel and a formatter you have never seen. `Notifier` must not extend anything or mention a part by name.

Run `pnpm lesson test oop/03-composition-over-inheritance`.

```hint
`Notifier` only needs two private fields, `#channel` and `#formatter`. `notify` is one line: format, then send.
```

```hint
Lines are joined with `"\n"`. `Array.prototype.map` then `join` gives you both formatters in two lines each.
```

```hint
Return early from `notify` when the list is empty, before you call the formatter. Otherwise the digest would send a header with nothing under it.
```

```hint
`useChannel` and `useFormatter` only reassign the private field. Because they are plain fields, the next `notify` sees the new part immediately.
```
