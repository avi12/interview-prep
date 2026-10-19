---
title: The LLD interview method
lang: none
minutes: 15
level: junior
roles: [backend, ai]
sources:
  - https://www.hellointerview.com/learn/low-level-design/in-a-hurry/delivery
  - https://algo.monster/courses/lld/lld_delivery_framework
  - https://refactoring.guru/design-patterns/state
  - https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction
  - https://martinfowler.com/bliki/Yagni.html
---

## What the round really tests

A **low-level design** (LLD) round asks for classes and methods for a small system: a parking lot, a vending machine, an elevator. No servers, no scale numbers.

The interviewer watches three things:

- Do you **clarify scope** before you draw?
- Do your classes have **clear jobs**, and does each piece of data have one owner?
- When they say **"now add X"**, does X cost one new class or ten edits?

> **Why:** the follow-up is where the grade is decided. A design that absorbs it calmly proves you understand the design, not only the first version.

> **Not this:** open the editor and start typing classes. Hello Interview lists "jumping into code before the structure is clear" as a common mistake.

```narrate
A low level design round asks for classes and methods for a small system, like a parking lot or a vending machine. There are no servers and no scale numbers. The interviewer watches three things. Do you clarify scope first? Do your classes have clear jobs? And when they say now add something, does it cost one new class or ten edits?
```

## The 35-minute timeline

Sources budget slightly differently: Hello Interview plans about 35 minutes, algo.monster about 40. This plan sits in the middle. The times are a plan, not a rule.

```svg Thirty-five minutes: most of the time goes to the diagram and the code, but the first ten decide whether they are the right ones
<svg viewBox="0 0 640 210" role="img" aria-label="Five interview steps laid out on a 35 minute clock" font-family="var(--font-mono)" font-size="12">
<path d="M214 10 L214 170" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<path d="M329.4 10 L329.4 170" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<path d="M444.9 10 L444.9 170" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<path d="M560.3 10 L560.3 170" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<path d="M618 10 L618 170" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="6 4"/>
<text x="214" y="188" fill="var(--fg-muted)" text-anchor="middle">0</text>
<text x="329.4" y="188" fill="var(--fg-muted)" text-anchor="middle">10</text>
<text x="444.9" y="188" fill="var(--fg-muted)" text-anchor="middle">20</text>
<text x="560.3" y="188" fill="var(--fg-muted)" text-anchor="middle">30</text>
<text x="618" y="188" fill="var(--fg-muted)" text-anchor="middle">35</text>
<text x="10" y="188" fill="var(--fg-muted)">minutes</text>
<g data-cue="requirements">
<text x="10" y="32" fill="var(--fg)">1 Requirements</text>
<rect x="214" y="17" width="57.7" height="22" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="242.8" y="32" fill="var(--fg)" text-anchor="middle">5</text>
</g>
<g data-cue="entities">
<text x="10" y="62" fill="var(--fg)">2 Entities</text>
<rect x="271.7" y="47" width="57.7" height="22" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="300.5" y="62" fill="var(--fg)" text-anchor="middle">5</text>
</g>
<g data-cue="diagram">
<text x="10" y="92" fill="var(--fg)">3 Relations + diagram</text>
<rect x="329.4" y="77" width="115.5" height="22" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="387.2" y="92" fill="var(--fg)" text-anchor="middle">10</text>
</g>
<g data-cue="code">
<text x="10" y="122" fill="var(--fg)">4 Code the core</text>
<rect x="444.9" y="107" width="138.5" height="22" fill="var(--accent-2)" stroke="var(--border)" stroke-width="2"/>
<text x="514.2" y="122" fill="var(--fg)" text-anchor="middle">12</text>
</g>
<g data-cue="extend">
<text x="10" y="152" fill="var(--fg)">5 Extend</text>
<rect x="583.4" y="137" width="34.6" height="22" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="600.7" y="152" fill="var(--fg)" text-anchor="middle">3</text>
</g>
</svg>
```

```narrate
Here is the plan for thirty five minutes. [[requirements]] Five minutes of questions, to fix what is in scope. [[entities]] Five minutes to name the nouns and verbs, with no code. [[diagram]] Ten minutes for relationships and the class diagram, including which patterns earn a place. [[code]] Twelve minutes to code the core and trace one scenario. [[extend]] Three minutes for the follow up, where you show where the change lands.
```

```quiz
q: In the 35-minute plan, which step gets the most time?
options:
  - requirements
  - relationships and diagram
  - code the core
  - extend
answer: 2
why: Coding the core takes 12 minutes. The two earlier steps are short on purpose, because cheap questions and names stop you from coding the wrong design.
```

## What to say at each step

Talking is the product. The interviewer cannot grade thoughts you did not say.

| Step | Say this out loud |
|---|---|
| 1 Requirements | "Let me confirm scope. In: park, leave, fee by hour. Out: payment, cameras, reservations. Is that right?" |
| 2 Entities | "Nouns: lot, slot, vehicle, ticket. A fee is a rule, so it is not a noun to model." |
| 3 Diagram | "The lot owns the slots. A ticket points at a slot. Pricing and slot choice are interfaces, because they will change." |
| 4 Code | "Happy path first, then the two failures. I inject the clock so I can test fees." |
| 5 Extend | "Weekend pricing is one new class behind the fee interface. The lot does not change." |

```narrate
At every step, say one plain sentence. Confirm what is in scope and what is out. Name the nouns, and say why a fee is a rule and not a noun. Describe who owns what. Say that you will do the happy path first and inject the clock. And when the follow up comes, say the one place it lands and what does not change.
```

> **Why:** a stated assumption costs you ten seconds. A silent wrong assumption costs you the round.

## Handling "now add X"

Four moves, in order:

1. **Classify** the change: new rule, new data, new action, or new state
2. **Find the seam** where it should land
3. **Say what does not change**
4. **Make the change**, or sketch it if time is short

```svg Each kind of change has a home: the design decides how big the edit is
<svg viewBox="0 0 520 230" role="img" aria-label="Four kinds of follow-up and where each one lands">
  <g font-family="var(--font-mono)" font-size="11">
    <rect x="10" y="70" width="100" height="70" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="60" y="110" text-anchor="middle" fill="var(--fg)" font-size="14">now add X</text>
    <path d="M110 105 L146 28 M110 105 L146 76 M110 105 L146 124 M110 105 L146 172" fill="none" stroke="var(--fg-muted)" stroke-width="2"/>
    <g data-cue="rule">
      <rect x="150" y="8" width="120" height="40" fill="var(--surface-2)" stroke="var(--cat-1)" stroke-width="2"/>
      <text x="210" y="33" text-anchor="middle" fill="var(--fg)">new rule</text>
      <path d="M270 28 L288 28" stroke="var(--primary)" stroke-width="2"/>
      <rect x="290" y="8" width="222" height="40" fill="var(--surface-3)" stroke="var(--ok)" stroke-width="2"/>
      <text x="300" y="33" fill="var(--fg)">new class behind the interface</text>
    </g>
    <g data-cue="data">
      <rect x="150" y="56" width="120" height="40" fill="var(--surface-2)" stroke="var(--cat-2)" stroke-width="2"/>
      <text x="210" y="81" text-anchor="middle" fill="var(--fg)">new type or coin</text>
      <path d="M270 76 L288 76" stroke="var(--primary)" stroke-width="2"/>
      <rect x="290" y="56" width="222" height="40" fill="var(--surface-3)" stroke="var(--ok)" stroke-width="2"/>
      <text x="300" y="81" fill="var(--fg)">new data, no code change</text>
    </g>
    <g data-cue="action">
      <rect x="150" y="104" width="120" height="40" fill="var(--surface-2)" stroke="var(--cat-3)" stroke-width="2"/>
      <text x="210" y="129" text-anchor="middle" fill="var(--fg)">new action</text>
      <path d="M270 124 L288 124" stroke="var(--primary)" stroke-width="2"/>
      <rect x="290" y="104" width="222" height="40" fill="var(--surface-3)" stroke="var(--ok)" stroke-width="2"/>
      <text x="300" y="129" fill="var(--fg)">one method on every state</text>
    </g>
    <g data-cue="state">
      <rect x="150" y="152" width="120" height="40" fill="var(--surface-2)" stroke="var(--cat-4)" stroke-width="2"/>
      <text x="210" y="177" text-anchor="middle" fill="var(--fg)">new state</text>
      <path d="M270 172 L288 172" stroke="var(--primary)" stroke-width="2"/>
      <rect x="290" y="152" width="222" height="40" fill="var(--surface-3)" stroke="var(--ok)" stroke-width="2"/>
      <text x="300" y="177" fill="var(--fg)">one new object, one table row</text>
    </g>
    <text x="10" y="218" fill="var(--fg-muted)">name the home before you type</text>
  </g>
</svg>
```

```narrate
Sort every follow up into one of four kinds. [[rule]] A new rule, like weekend pricing, is a new class behind the interface that already exists. [[data]] A new vehicle type or coin is new data, with no code change. [[action]] A new action, like paying by card, adds one method to every state. [[state]] A new state is one new object and one new row in the table. Say the home before you type.
```

> **Not this:** bluffing "easy, one line" when your design has no seam. If it is hard, say so, extract the interface first, then add X. That is a strong answer.

```quiz
q: The interviewer says "add a student discount", but your fee logic is an if chain inside ParkingLot. Best move?
options:
  - say it is easy and add one more if
  - say there is no seam yet, extract a FeePolicy interface, then add the discount as a class
  - restart the whole design on a fresh page
answer: 1
why: Honest, small, and it shows you know where the seam should be. Hiding the problem or restarting both cost more.
```

## Failure modes

| Mistake | What it looks like | Instead |
|---|---|---|
| Over-patterning | Singleton, Factory, Observer with no requirement behind them | Name the follow-up each pattern answers. No follow-up, no pattern |
| No tests | The code is never run or traced | Trace one scenario aloud. Test the happy path and one failure |
| Modelling the UI | Buttons, screens, a display class | Model behavior. A UI would call your methods |
| Silent coding | Ten quiet minutes | Say each choice: "X over Y, because" |
| Inheritance by reflex | `Car extends Vehicle` for every type | Types that differ by data are data |
| Edge cases first | Polishing validation before the main path works | Happy path, then failures |

> **Not this:** perfect UML. Hello Interview: simple boxes and arrows are enough, and fixating on notation is a mistake.

> **Trap:** an abstraction guessed too early. Sandi Metz: "duplication is far cheaper than the wrong abstraction". Add the seam the follow-up needs, not ten guesses.

```narrate
Know the common failures. Using patterns nobody asked for. Never running or tracing your code. Modelling buttons and screens instead of behavior. Coding in silence. Making a subclass for each type when the types differ only by data. And polishing edge cases before the main path works. The fix for each one is in the right hand column.
```

## The checklist

- [ ] Restated the problem, listed in scope and out of scope
- [ ] Named nouns and verbs, said which nouns are not classes
- [ ] Drew boxes and arrows, said who owns which data
- [ ] Picked at most two patterns, each tied to a follow-up
- [ ] Coded the happy path, then the failure cases
- [ ] Injected anything random or time-based
- [ ] Traced one scenario aloud, or ran one test
- [ ] Answered "now add X" with its home and what stays unchanged

Practice: redo the parking lot or the vending machine cold with a 35 minute timer. Then try a new one with the same method: an elevator, a library, an ATM.

```narrate
Before you leave the board, run the checklist. Did you list what is in and out of scope? Did you name the nouns and say which are not classes? Did you pick at most two patterns, each tied to a follow up? Did you code the happy path, then the failures, and trace one scenario aloud? Practice the whole method cold, on a timer, with a new problem like an elevator or an A T M.
```
