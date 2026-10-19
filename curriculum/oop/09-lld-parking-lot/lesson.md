---
title: LLD interview - parking lot
lang: ts
minutes: 40
level: junior
roles: [backend, ai]
files: [parkingLot.ts]
sources:
  - https://www.hellointerview.com/learn/low-level-design/in-a-hurry/delivery
  - https://www.hellointerview.com/learn/low-level-design/problem-breakdowns/parking-lot
  - https://algo.monster/courses/lld/lld_delivery_framework
  - https://www.codingshuttle.com/low-level-system-design-lld-handbook/design-a-parking-lot
  - https://refactoring.guru/design-patterns/strategy
---

## The first draft that breaks

"Design a parking lot" is a classic **low-level design** (LLD) question: classes and methods, not servers. The usual first draft:

```ts
class Car extends Vehicle {}
class Motorcycle extends Vehicle {}
class Truck extends Vehicle {}

fee(vehicle, hours) {
  if (vehicle instanceof Truck) return hours * 500;
  if (vehicle instanceof Car) return hours * 200;
  return hours * 100;
}
```

Then the interviewer says: "add a bus, and a weekend rate." A bus edits the class list **and** the `if` chain. Weekend pricing edits `fee` again. The same logic leaks into slot assignment.

> **Why:** "now add X" is not a trick. It measures how many places your design must change. A good design answers with one new class.

```narrate
Most first drafts make a class for each vehicle and an if chain for each price. Then the interviewer asks for a bus and a weekend rate. Every new request edits the vehicle list and the if chain. That follow-up is the real test, so design for it from the start.
```

## The procedure

Do the same five steps every time. The order is the point.

```svg Five steps, each with one thing to put on the whiteboard
<svg viewBox="0 0 520 190" role="img" aria-label="Ask, name, draw, pick, code">
  <g font-family="var(--font-mono)" font-size="11" text-anchor="middle">
    <g data-cue="ask">
      <rect x="6" y="30" width="94" height="70" fill="var(--primary-container)" stroke="var(--cat-1)" stroke-width="2"/>
      <text x="53" y="56" fill="var(--fg)" font-size="14">1 ASK</text>
      <text x="53" y="78" fill="var(--fg-muted)">scope, rules</text>
      <text x="53" y="130" fill="var(--fg-muted)">in and out</text>
      <text x="53" y="146" fill="var(--fg-muted)">of scope list</text>
    </g>
    <g data-cue="name">
      <rect x="109" y="30" width="94" height="70" fill="var(--primary-container)" stroke="var(--cat-2)" stroke-width="2"/>
      <text x="156" y="56" fill="var(--fg)" font-size="14">2 NAME</text>
      <text x="156" y="78" fill="var(--fg-muted)">nouns, verbs</text>
      <text x="156" y="130" fill="var(--fg-muted)">classes and</text>
      <text x="156" y="146" fill="var(--fg-muted)">method names</text>
    </g>
    <g data-cue="draw">
      <rect x="212" y="30" width="94" height="70" fill="var(--primary-container)" stroke="var(--cat-3)" stroke-width="2"/>
      <text x="259" y="56" fill="var(--fg)" font-size="14">3 DRAW</text>
      <text x="259" y="78" fill="var(--fg-muted)">boxes, arrows</text>
      <text x="259" y="130" fill="var(--fg-muted)">who holds</text>
      <text x="259" y="146" fill="var(--fg-muted)">whom</text>
    </g>
    <g data-cue="pick">
      <rect x="315" y="30" width="94" height="70" fill="var(--primary-container)" stroke="var(--cat-4)" stroke-width="2"/>
      <text x="362" y="56" fill="var(--fg)" font-size="14">4 PICK</text>
      <text x="362" y="78" fill="var(--fg-muted)">1-2 patterns</text>
      <text x="362" y="130" fill="var(--fg-muted)">named seams,</text>
      <text x="362" y="146" fill="var(--fg-muted)">with reasons</text>
    </g>
    <g data-cue="code">
      <rect x="418" y="30" width="94" height="70" fill="var(--primary-container)" stroke="var(--cat-5)" stroke-width="2"/>
      <text x="465" y="56" fill="var(--fg)" font-size="14">5 CODE</text>
      <text x="465" y="78" fill="var(--fg-muted)">core + test</text>
      <text x="465" y="130" fill="var(--fg-muted)">a working</text>
      <text x="465" y="146" fill="var(--fg-muted)">happy path</text>
    </g>
    <path d="M100 65 L109 65 M203 65 L212 65 M306 65 L315 65 M409 65 L418 65" stroke="var(--primary)" stroke-width="2"/>
  </g>
</svg>
```

```narrate
[[ask]] First, ask questions until you can write down what is in scope and what is not. [[name]] Second, pull the nouns and verbs out of those answers. [[draw]] Third, draw the boxes and the arrows between them. [[pick]] Fourth, pick one or two patterns, and say why. [[code]] Fifth, code the core and test it. Skipping ahead is the most common mistake.
```

> **Not this:** open the editor and type `class ParkingLot`. You will code a design you never agreed on, and the follow-up will not fit.

## Steps 1 and 2: ask, then name

Questions that matter: vehicle types? how is a fee charged? what if full? what is out of scope? Then read your own answers for **nouns** and **verbs**.

| Phrase | Becomes | Why |
|---|---|---|
| "a vehicle enters and gets a ticket" | `park(vehicle)` returns `Ticket` | a verb on the lot |
| "a slot that fits" | `Slot` with a `size` | data, not subclasses |
| "pay by the hour" | `FeePolicy` | a rule that will change |
| "gates, cameras, payment" | out of scope | say it out loud |

Not every noun is a class. A **fee** is a rule. A **gate** is out of scope. Say so.

```narrate
Turn each phrase from the requirements into a decision. A verb like park becomes a method on the lot. A slot that fits becomes data with a size. Pay by the hour is a rule that will change, so it gets its own place. Things like gates and cameras are out of scope, and you should say that out loud.
```

> **Trap:** one class per noun. If two nouns differ only by a number or a name, such as `Car` and `Truck`, they are one class with data.

## Step 3: draw the class diagram

Vehicle types are **data**: a name and a size. A slot fits a vehicle when `slot.size >= vehicle.type.size`. The two rules the interviewer will change get an interface.

```svg Data classes on the left, the lot in the middle, the two changing rules on the right
<svg viewBox="0 0 520 240" role="img" aria-label="Class diagram of a parking lot with two strategy interfaces">
  <g font-family="var(--font-mono)" font-size="11">
    <g data-cue="data">
      <rect x="10" y="10" width="130" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="30" fill="var(--fg)" font-size="13">Slot</text>
      <text x="20" y="50" fill="var(--fg-muted)">id, size</text>
      <rect x="10" y="90" width="130" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="110" fill="var(--fg)" font-size="13">Vehicle</text>
      <text x="20" y="130" fill="var(--fg-muted)">plate, type</text>
      <rect x="10" y="176" width="130" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="196" fill="var(--fg)" font-size="13">VehicleType</text>
      <text x="20" y="216" fill="var(--fg-muted)">name, size</text>
      <path d="M75 142 L75 176" stroke="var(--fg-muted)" stroke-width="2"/>
      <rect x="190" y="176" width="140" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="200" y="196" fill="var(--fg)" font-size="13">Ticket</text>
      <text x="200" y="216" fill="var(--fg-muted)">id, slot, enteredAt</text>
    </g>
    <g data-cue="lot">
      <rect x="190" y="70" width="140" height="70" fill="var(--primary-container)" stroke="var(--primary)" stroke-width="2"/>
      <text x="200" y="92" fill="var(--fg)" font-size="14">ParkingLot</text>
      <text x="200" y="112" fill="var(--fg-muted)">park(vehicle)</text>
      <text x="200" y="128" fill="var(--fg-muted)">leave(ticketId)</text>
      <path d="M190 90 L140 40 M190 110 L140 116 M260 140 L260 176" fill="none" stroke="var(--fg-muted)" stroke-width="2"/>
    </g>
    <g data-cue="strategies">
      <path d="M330 90 L380 50 M330 120 L380 120" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="380" y="20" width="130" height="56" fill="var(--surface-3)" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="390" y="40" fill="var(--fg-muted)">interface</text>
      <text x="390" y="60" fill="var(--fg)" font-size="13">SlotChooser</text>
      <rect x="380" y="94" width="130" height="56" fill="var(--surface-3)" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="390" y="114" fill="var(--fg-muted)">interface</text>
      <text x="390" y="134" fill="var(--fg)" font-size="13">FeePolicy</text>
    </g>
  </g>
</svg>
```

```narrate
[[data]] On the left are the plain data classes: a slot with a size, a vehicle with a type, and the type itself, which is just a name and a size. A ticket records where and when. [[lot]] In the middle, the parking lot holds the slots and has two methods. [[strategies]] On the right are the two rules that will change: how to choose a slot, and how to charge a fee. Each is an interface.
```

## Step 4: patterns that earn their place

Pick the patterns the **follow-ups** will use. Here that is **Strategy** twice. A strategy puts one algorithm behind an interface so you can swap it (Refactoring Guru).

| Seam | Strategy | The follow-up it answers |
|---|---|---|
| fee | `FeePolicy` | "add weekend pricing" is one new class |
| slot choice | `SlotChooser` | "park near the exit" is one new class |

> **Not this:** `Car extends Vehicle`, `Truck extends Vehicle`. The types differ only by data, so a subclass per type adds nothing.

> **Trap:** Singleton, Factory and Observer here. No requirement asks for them. Naming patterns nobody needs reads as memorizing, not designing.

```quiz
q: The interviewer says "add weekend pricing". With this design, what changes?
options:
  - the ParkingLot class gets a new if branch
  - one new class that implements FeePolicy, passed in when the lot is built
  - a new subclass of every vehicle type
answer: 1
why: Pricing sits behind an interface, so the lot never learns the rule. The change is one new class plus one line of wiring.
```

```narrate
Choose patterns by the follow-ups they will answer. Pricing and slot choice are the two things an interviewer will change, so each gets a strategy. Vehicle types stay as plain data. Do not add a singleton or a factory just to name a pattern. Say which follow-up each pattern answers.
```

## Step 5: code the core

The **lot** enforces the rule that never changes: a slot must be free and big enough. The **strategy** only chooses among those candidates.

```svg A car arrives: the lot removes taken and too-small slots, then best fit picks from what is left
<svg viewBox="0 0 520 210" role="img" aria-label="Candidates filtered by the lot, then chosen by the strategy">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="slots">
      <rect x="14" y="30" width="110" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="69" y="54" fill="var(--fg)">small-1</text>
      <text x="69" y="74" fill="var(--fg-muted)">size 1</text>
      <rect x="140" y="30" width="110" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="195" y="54" fill="var(--fg)">medium-1</text>
      <text x="195" y="74" fill="var(--fg-muted)">size 2</text>
      <rect x="266" y="30" width="110" height="56" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="321" y="54" fill="var(--fg)">medium-2</text>
      <text x="321" y="74" fill="var(--fg-muted)">size 2, taken</text>
      <rect x="392" y="30" width="110" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="447" y="54" fill="var(--fg)">large-1</text>
      <text x="447" y="74" fill="var(--fg-muted)">size 3</text>
      <text x="14" y="18" text-anchor="start" fill="var(--fg-muted)">a car (size 2) arrives</text>
    </g>
    <g data-cue="fit">
      <path d="M40 42 L98 74 M98 42 L40 74" stroke="var(--danger)" stroke-width="3"/>
      <path d="M292 42 L350 74 M350 42 L292 74" stroke="var(--danger)" stroke-width="3"/>
      <text x="69" y="108" fill="var(--danger)">too small</text>
      <text x="321" y="108" fill="var(--danger)">taken</text>
      <text x="260" y="138" fill="var(--fg)">lot keeps: free and size at least 2</text>
    </g>
    <g data-cue="choose">
      <rect x="140" y="30" width="110" height="56" fill="none" stroke="var(--ok)" stroke-width="4"/>
      <text x="260" y="176" fill="var(--fg)">best fit picks the smallest candidate: medium-1</text>
      <path d="M195 160 L195 92 M189 102 L195 92 L201 102" fill="none" stroke="var(--ok)" stroke-width="2"/>
    </g>
  </g>
</svg>
```

```narrate
[[slots]] A car arrives. The lot has four slots, and one is taken. [[fit]] The lot first removes the slots that cannot work: one is too small, one is taken. It keeps the free slots that are big enough. That rule never changes, so it lives in the lot. [[choose]] Then the strategy picks among the candidates. Best fit chooses the smallest one, which leaves the large slot free for a truck.
```

> **Why:** if the strategy checked "free and big enough" itself, every new strategy would need to repeat it, and one of them would get it wrong.

Two habits to show: **inject the clock** (tests control time), and in `leave`, **work out the fee before** you free the slot (a failing fee must not lose the vehicle).

## Say it, then build it

The sentence for the end of step 4:

> **Say it out loud:** "Vehicle types are data, because they only differ by size and name. Pricing and slot choice are strategies, because those are what change. Weekend pricing would be one new class, and the lot would not change."

Also say what is **out of scope**, and what you would add next: multiple floors, concurrent entry (two cars racing for one slot).

```narrate
End step four with one sentence. Vehicle types are data, because they only differ by size and name. Pricing and slot choice are strategies, because those are what change. Weekend pricing would be one new class, and the lot would not change. Then say what is out of scope, and what you would add next, such as several floors.
```

## Your turn

`contracts.ts` is your class diagram, already written. Read it, do not edit it. In `parkingLot.ts` implement:

- `createBestFitChooser()`: the smallest candidate, the first one on a tie
- `createHourlyFee({ centsPerHour })`: started hours, minimum one hour, rate by `vehicle.type.name`. Throw if there is no rate
- `createParkingLot(options)`: `park`, `leave`, `freeSlotCount`. Reject a plate already parked. Candidates are free slots with `size >= vehicle.type.size`

The tests add a new vehicle type, a new fee policy and a new slot chooser **inside the test**. Your lot must accept them unchanged.

Run `pnpm lesson test oop/09-lld-parking-lot`.

```hint
Keep three things inside `createParkingLot`: a `Set` of occupied slot ids, a `Set` of parked plates, and a `Map` from ticket id to the ticket and its vehicle.
```

```hint
`park`: reject a parked plate, compute `candidates`, call `chooser.choose({ candidates, vehicle })`, return full if it gives back `undefined`, then record the ticket with `clock.nowMs()`.
```

```hint
`leave`: find the ticket or return unknown. Minutes are `Math.ceil(elapsedMs / 60_000)`. Call `fees.feeCents(...)` before you delete anything from the sets and the map.
```

```hint
Hourly fee: `Math.max(1, Math.ceil(minutes / 60)) * rate`. Look the rate up with `centsPerHour[vehicle.type.name]` and throw when it is `undefined`.
```
