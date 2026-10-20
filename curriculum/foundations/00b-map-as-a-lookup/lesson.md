---
title: A Map Is a Lookup Table
lang: ts
minutes: 12
level: junior
roles: [backend, analyst, ai]
files: [countWords.ts]
sources:
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
  - https://www.bigocheatsheet.com/
---

## Key in, value out

A `Map` stores pairs. You give it a **key**, it gives back the **value**, in one step.

```ts
const ageByName = new Map<string, number>();
ageByName.set("Dana", 31);
ageByName.get("Dana");   // 31
ageByName.get("Omer");   // undefined
ageByName.has("Dana");   // true
```

Think of a phone book: you do not read every page, you jump to the name.

```narrate
A Map stores pairs. You give it a key, and it hands back the value in one step. Like a phone book, you do not read every page, you jump straight to the name. If the key is not there, you get undefined.
```

## Why not search a list?

A list of pairs works, but to find one name you check the entries one by one. With a million entries that is up to a million checks. A `Map` jumps straight to the entry.

```svg Looking up "Dana": a list checks entries in turn, a Map goes straight there
<svg viewBox="0 0 520 190" role="img" aria-label="List scan versus map lookup">
  <g data-cue="scan" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="28" fill="var(--fg-muted)">list: scan</text>
    <rect x="20" y="40" width="70" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="55" y="62" text-anchor="middle" fill="var(--fg)">Omer</text>
    <rect x="100" y="40" width="70" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="135" y="62" text-anchor="middle" fill="var(--fg)">Noa</text>
    <rect x="180" y="40" width="70" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="215" y="62" text-anchor="middle" fill="var(--fg)">Dana</text>
    <text x="270" y="62" fill="var(--danger)">3 checks</text>
  </g>
  <g data-cue="jump" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="116" fill="var(--fg-muted)">Map: jump</text>
    <rect x="20" y="128" width="110" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="75" y="150" text-anchor="middle" fill="var(--fg)">Dana -> 31</text>
    <text x="150" y="150" fill="var(--ok)">1 step</text>
  </g>
</svg>
```

```narrate
[[scan]] A plain list makes you check the entries one by one until you hit Dana. With a million entries, that is up to a million checks. [[jump]] A Map goes straight to Dana in one step, no matter how big it is.
```

> **Why:** a Map lookup is **O(1)** on average, so size does not slow it down. You pay with memory to buy speed.

> **Not this:** an array of pairs plus a search loop. It is **O(n)** per lookup, and inside another loop it becomes **O(n²)**.

## Counting with a Map

The classic use: count how often each word appears. For each word, read the old count (or `0` if new), add one, store it back.

```ts
countByWord.set(word, (countByWord.get(word) ?? 0) + 1);
```

`?? 0` means "if there is no value yet, use 0".

> **Trap:** a plain object `{}` looks similar, but it already has keys like `constructor` and `toString`. A `Map` starts truly empty.

```narrate
The classic use is counting. For each word, read the old count, or zero if the word is new, add one, and store it back. Use a Map rather than a plain object, because a plain object already has hidden keys like constructor.
```

```quiz
q: What does map.get("zzz") return when "zzz" was never stored?
options:
  - 0
  - undefined
  - an error
answer: 1
why: A missing key gives undefined, which is why counting code adds ?? 0.
```

## Your turn

Open `countWords.ts` and make the tests pass. It exports `countWords(words)` and returns a `Map` from word to count.

- One loop, one `Map`
- Case matters: `cat` and `Cat` are different words

Run the tests from the Run button, or `pnpm lesson test foundations/00b-map-as-a-lookup`.

```hint
Create `new Map<string, number>()` before the loop and return it after.
```

```hint
Inside the loop, read the old count with `map.get(word) ?? 0`.
```

```hint
Store the new count: `map.set(word, oldCount + 1)`.
```
