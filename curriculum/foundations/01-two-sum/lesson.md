---
title: Two Sum
lang: ts
minutes: 15
level: junior
roles: [backend, analyst, ai]
files: [twoSum.ts]
sources:
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
  - https://www.bigocheatsheet.com/
---

## The problem

Given `numbers` and a `target`, return the **indexes** of the two numbers that add up to `target`.

- Exactly one answer exists
- Never use the same position twice
- Order of the two indexes does not matter

`twoSum([2, 7, 11, 15], 9)` returns `[0, 1]`, because `2 + 7 = 9`.

```narrate
You get a list of numbers and a target. Find the two positions whose numbers add up to the target. This is the most common first question in interviews, so it is worth learning the idea behind it, not just the answer.
```

## Brute force, and its price

Check every pair. Two nested loops. It works.

```ts
for (let i = 0; i < numbers.length; i++)
  for (let j = i + 1; j < numbers.length; j++)
    if (numbers[i] + numbers[j] === target) return [i, j];
```

For `n` numbers that is about `n * n / 2` checks. At 200,000 numbers that is 20 billion checks. That is **O(n²)**.

> **Why:** interviewers say "can you do better?" right after this. Naming the cost out loud is half the answer.

```narrate
The obvious way is to check every pair with two loops. It is correct, but the work grows with the square of the list size. At two hundred thousand numbers that is billions of checks, and that is the cue to look for a better idea.
```

## Remember what you have seen

When you stand on a number, you already know what you need: `target - number`. Ask one question: **have I seen that already?**

A `Map` from value to index answers in one step. Walk the list once. For each number, look up its partner. If it is there, done. If not, store this number and move on.

```svg Walking [2, 7, 11, 15] with target 9: the partner of 7 is 2, and 2 is already in the map
<svg viewBox="0 0 520 190" role="img" aria-label="Array walk with a map of seen values">
  <g data-cue="array" font-family="var(--font-mono)" font-size="16">
    <rect x="20" y="20" width="60" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="50" y="48" text-anchor="middle" fill="var(--fg)">2</text>
    <rect x="90" y="20" width="60" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="120" y="48" text-anchor="middle" fill="var(--fg)">7</text>
    <rect x="160" y="20" width="60" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="190" y="48" text-anchor="middle" fill="var(--fg)">11</text>
    <rect x="230" y="20" width="60" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="260" y="48" text-anchor="middle" fill="var(--fg)">15</text>
  </g>
  <g data-cue="seen" font-family="var(--font-mono)" font-size="14">
    <text x="20" y="112" fill="var(--fg-muted)">seen:</text>
    <rect x="80" y="92" width="110" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="135" y="112" text-anchor="middle" fill="var(--fg)">2 -> index 0</text>
  </g>
  <g data-cue="hit" font-family="var(--font-mono)" font-size="14">
    <path d="M120 66 L120 82 L135 82 L135 90" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="20" y="162" fill="var(--fg)">at 7: need 9 - 7 = 2 -> found at index 0 -> answer [0, 1]</text>
  </g>
</svg>
```

```narrate
Walk the list once. [[array]] Here is the list, and we are standing on the seven. [[seen]] The map already holds the two we passed, with its index. [[hit]] We need nine minus seven, which is two. The map has it, so the answer is index zero and index one.
```

> **Why:** a map lookup is **O(1)** on average, so one pass costs **O(n)**. You pay with memory, `O(n)` for the map, to buy time. That trade is the core of many interview answers.

## Why not sort and use two pointers?

Sorting plus two pointers (one index at each end, moving inward) also finds the pair, in `O(n log n)`. But sorting **moves the numbers**, and the question asks for the **original indexes**. You would need to carry the indexes along.

> **Not this:** sort first. It is slower than one pass and loses the positions you were asked for.

> **Trap:** insert the current number into the map **after** the lookup. Do it before, and `[3, 2]` with `target = 6` matches the 3 with itself and returns `[0, 0]`, though no pair exists.

```narrate
You could sort the list and walk two pointers inward. That works, but sorting shuffles the positions and the question wants the original ones. One more trap: look the partner up before you store the current number, or a number can pair with itself.
```

```quiz
q: You are on a number x and the target is t. What do you look up in the map?
options:
  - x
  - t - x
  - t + x
answer: 1
why: The partner is whatever number completes the sum, and that is t - x.
```

## Your turn

Open `twoSum.ts` in your copy and make the tests pass. The file exports `twoSum(numbers, target)`.

- One loop, one `Map`
- Return `[]` if nothing matches. The tests check this, because a function should say what it does when it fails

Run the tests from the Run button, or `pnpm lesson test foundations/01-two-sum`.

```hint
Create a `Map<number, number>` from value to index before the loop.
```

```hint
Inside the loop, compute `target - value`, then ask the map for it. If you get an index back, return it with the current index.
```

```hint
Early return when found, so the happy path stays flat. Store the current value only if you did not return.
```
