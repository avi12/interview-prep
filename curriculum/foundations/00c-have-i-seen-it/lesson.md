---
title: Have I Seen It Before?
lang: ts
minutes: 12
level: junior
roles: [backend, analyst, ai]
files: [hasDuplicate.ts]
sources:
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
  - https://www.bigocheatsheet.com/
---

## The question behind many questions

"Is there a repeat?" "Is there a partner?" Many interview questions come down to one thing: **have I seen this before?**

A `Set` answers it. It is a `Map` with keys only, no values.

```ts
const seen = new Set<number>();
seen.add(4);
seen.has(4);   // true
seen.has(9);   // false
```

```narrate
Many interview questions come down to one thing. Have I seen this before? A Set answers it. It is like a Map that keeps keys only. You add a value, and later you ask if it is there.
```

## Walk once, remember

The slow way compares every value with every other value: about `n * n / 2` checks, which is **O(n²)**. At 200,000 numbers that is 20 billion checks.

The fast way walks the list once and remembers what it passed.

```svg Walking [1, 2, 3, 1]: the set grows until the second 1 is found inside it
<svg viewBox="0 0 520 190" role="img" aria-label="Walk with a set of seen values">
  <g data-cue="list" font-family="var(--font-mono)" font-size="16">
    <rect x="20" y="20" width="60" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="50" y="48" text-anchor="middle" fill="var(--fg)">1</text>
    <rect x="90" y="20" width="60" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="120" y="48" text-anchor="middle" fill="var(--fg)">2</text>
    <rect x="160" y="20" width="60" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="190" y="48" text-anchor="middle" fill="var(--fg)">3</text>
    <rect x="230" y="20" width="60" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="260" y="48" text-anchor="middle" fill="var(--fg)">1</text>
  </g>
  <g data-cue="set" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="112" fill="var(--fg-muted)">seen:</text>
    <rect x="80" y="92" width="130" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="145" y="112" text-anchor="middle" fill="var(--fg)">{ 1, 2, 3 }</text>
  </g>
  <g data-cue="hit" font-family="var(--font-mono)" font-size="14">
    <path d="M260 66 L260 78 L145 78 L145 90" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="20" y="162" fill="var(--fg)">at the last 1: is 1 in seen? yes -> duplicate</text>
  </g>
</svg>
```

```narrate
[[list]] Here is the list, one, two, three, one. [[set]] As we walk, we add each number to the set. After three steps the set holds one, two and three. [[hit]] On the last number we ask if one is already in the set. It is, so we found a repeat, and we stop right there.
```

> **Why:** a `Set` check is **O(1)** on average, so one pass costs **O(n)**. You spend memory to save time. This is the exact idea of Two Sum, the next lesson.

> **Not this:** two nested loops. Same answer, but it times out on big inputs, and "can you do better?" is the usual follow-up.

## Order matters: ask, then add

Ask `seen.has(value)` **before** `seen.add(value)`. If you add first, every value finds itself and the answer is always `true`.

> **Trap:** add first, then ask. `[1, 2, 3]` would report a duplicate.

```narrate
Order matters. Ask if the value is in the set first, and only then add it. If you add first, every value finds itself, and the answer is always yes.
```

```quiz
q: Why do we call seen.has(value) before seen.add(value)?
options:
  - add is slower
  - otherwise each value finds itself and every list looks duplicated
  - has only works on an empty set
answer: 1
why: Adding first makes the value present when we ask, so the check always passes.
```

## Your turn

Open `hasDuplicate.ts` and make the tests pass. It exports `hasDuplicate(numbers)` and returns `true` or `false`.

- One loop, one `Set`
- Return early as soon as you find a repeat

Run the tests from the Run button, or `pnpm lesson test foundations/00c-have-i-seen-it`.

```hint
Create `new Set<number>()` before the loop.
```

```hint
Inside the loop: if `seen.has(value)`, return `true`.
```

```hint
If it was not there, `seen.add(value)`. After the loop, return `false`.
```
