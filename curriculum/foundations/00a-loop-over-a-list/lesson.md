---
title: Loop Over a List
lang: ts
minutes: 10
level: junior
roles: [backend, analyst, ai]
files: [findLargest.ts]
sources:
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
---

## One pass, one note

Most interview answers start the same way: walk the list **once** and keep a note of what you have seen so far.

```ts
let total = 0;
for (const value of numbers) {
  total = total + value;
}
```

`for...of` hands you one value at a time. `total` is the **note**: it lives outside the loop, so it survives from one step to the next.

```narrate
Almost every list question starts the same way. Walk the list once, and keep a note of what you have seen so far. The loop hands you one value at a time, and the note lives outside the loop, so it is still there on the next step.
```

## Keep the biggest so far

To find the largest number, the note is "the biggest so far". Each step asks one question: is this value bigger than my note?

```svg Walking [3, 9, 4]: the note changes only when a bigger value shows up
<svg viewBox="0 0 520 190" role="img" aria-label="Walk with a biggest-so-far note">
  <g data-cue="list" font-family="var(--font-mono)" font-size="16">
    <rect x="20" y="20" width="60" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="50" y="48" text-anchor="middle" fill="var(--fg)">3</text>
    <rect x="90" y="20" width="60" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="120" y="48" text-anchor="middle" fill="var(--fg)">9</text>
    <rect x="160" y="20" width="60" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="190" y="48" text-anchor="middle" fill="var(--fg)">4</text>
  </g>
  <g data-cue="first" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="108" fill="var(--fg)">at 3: note is empty -> note = 3</text>
  </g>
  <g data-cue="bigger" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="132" fill="var(--accent-2)">at 9: 9 > 3 -> note = 9</text>
  </g>
  <g data-cue="smaller" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="156" fill="var(--fg-muted)">at 4: 4 > 9? no -> note stays 9</text>
  </g>
</svg>
```

```narrate
[[list]] Here is the list, three, nine, four. [[first]] On the three, the note is empty, so the three becomes the note. [[bigger]] On the nine, it beats the note, so the note becomes nine. [[smaller]] On the four, it does not beat nine, so the note stays.
```

> **Why:** one pass means the work grows in step with the list. That is **O(n)**, and it is the baseline interviewers expect.

## Start with "nothing yet"

What is the note before the first value? Not `0`. If every number is negative, `0` would beat them all and be a wrong answer.

Use `null` to mean "nothing yet", and let the first value take its place.

> **Not this:** `let largest = 0`. It is wrong for `[-8, -2]`.

> **Trap:** an empty list has no largest number. Decide what to return (`null`) and do it first thing.

```narrate
What is the note before the first value? Not zero. If every number is negative, zero would win and the answer would be wrong. Use null to mean nothing yet, and let the first value take its place. Also decide what an empty list returns.
```

```quiz
q: Why does the "biggest so far" note start as null instead of 0?
options:
  - null is faster
  - zero would beat a list of all negative numbers
  - the loop needs a number
answer: 1
why: A starting value of 0 can be bigger than every real value, so the answer would be wrong.
```

## Your turn

Open `findLargest.ts` and make the tests pass. It exports `findLargest(numbers)`.

- One `for...of` loop and one note
- Return `null` for an empty list

Run the tests from the Run button, or `pnpm lesson test foundations/00a-loop-over-a-list`.

```hint
Create `let largest: number | null = null` before the loop.
```

```hint
Inside the loop: if `largest` is `null` or `value > largest`, set `largest = value`.
```

```hint
After the loop, `return largest`. An empty list never enters the loop, so it returns `null` for free.
```
