---
title: Product of Array Except Self
lang: ts
minutes: 20
level: junior
roles: [backend, analyst, ai]
files: [productExceptSelf.ts]
sources:
  - https://leetcode.doocs.org/en/lc/238/
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Division
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
---

## The problem

Given `numbers`, return a list of the same length. At each position `i`, put the **product of every other number** (all except `numbers[i]`).

- `productExceptSelf([1, 2, 3, 4])` returns `[24, 12, 8, 6]`
- `productExceptSelf([0, 4, 2])` returns `[8, 0, 0]`
- Do **not** use division
- Aim for `O(n)` time

```narrate
For every position, multiply all the other numbers together. With one, two, three, four, the answer for the first position is two times three times four, which is twenty four. And there is a rule: no division. Interviewers add that rule on purpose, so let us see why.
```

## Two ways that fail

**Brute force.** For each position, loop over all the others and multiply. Two nested loops: `O(n²)`. With 100,000 numbers that is 10 billion multiplications.

**The division shortcut.** Multiply everything once, then divide by each number. One pass, `O(n)`. It looks perfect, and the problem forbids it for a reason: a **zero** breaks it. The total becomes `0`, and at the zero's own position you compute `0 / 0`, which is `NaN` (not a number). Even without the rule, the shortcut needs special code for zeros.

> **Why:** the rule forces you to find a structure that works for every input, zeros included.

> **Not this:** total product divided by each number. It is banned, and one zero in the input gives `NaN` at that position instead of the right answer.

```narrate
Two ideas fail. Brute force multiplies everything for every position, and that is quadratic: ten billion steps for one hundred thousand numbers. The division shortcut is fast, but a single zero turns the total into zero, and at that position zero divided by zero is not a number. That is why the rule exists. We need a way that never divides.
```

## Left times right

For position `i`, the answer is two products multiplied:

- the product of everything **to the left** of `i`
- the product of everything **to the right** of `i`

Each of those is a **running product** (a product you update as you walk along), so you can build all of them in one pass each.

```svg For the number 3: everything left of it is 1 times 2 = 2, everything right is 4, and 2 times 4 = 8
<svg viewBox="0 0 520 230" role="img" aria-label="Rows of numbers, left products, right products and answers">
  <g font-family="var(--font-mono)" font-size="16">
    <g data-cue="numbers">
      <text x="20" y="43" fill="var(--fg-muted)" font-size="13">numbers</text>
      <rect x="130" y="20" width="60" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="160" y="44" text-anchor="middle" fill="var(--fg)">1</text>
      <rect x="190" y="20" width="60" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="220" y="44" text-anchor="middle" fill="var(--fg)">2</text>
      <rect x="250" y="20" width="60" height="36" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="44" text-anchor="middle" fill="var(--fg)">3</text>
      <rect x="310" y="20" width="60" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="44" text-anchor="middle" fill="var(--fg)">4</text>
    </g>
    <g data-cue="left">
      <text x="20" y="89" fill="var(--fg-muted)" font-size="13">left of me</text>
      <rect x="130" y="66" width="60" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="160" y="90" text-anchor="middle" fill="var(--fg)">1</text>
      <rect x="190" y="66" width="60" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="220" y="90" text-anchor="middle" fill="var(--fg)">1</text>
      <rect x="250" y="66" width="60" height="36" fill="var(--cat-1)" fill-opacity="0.5" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="90" text-anchor="middle" fill="var(--fg)">2</text>
      <rect x="310" y="66" width="60" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="90" text-anchor="middle" fill="var(--fg)">6</text>
    </g>
    <g data-cue="right">
      <text x="20" y="135" fill="var(--fg-muted)" font-size="13">right of me</text>
      <rect x="130" y="112" width="60" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="160" y="136" text-anchor="middle" fill="var(--fg)">24</text>
      <rect x="190" y="112" width="60" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="220" y="136" text-anchor="middle" fill="var(--fg)">12</text>
      <rect x="250" y="112" width="60" height="36" fill="var(--cat-2)" fill-opacity="0.5" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="136" text-anchor="middle" fill="var(--fg)">4</text>
      <rect x="310" y="112" width="60" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="136" text-anchor="middle" fill="var(--fg)">1</text>
    </g>
    <g data-cue="answer">
      <text x="20" y="193" fill="var(--fg-muted)" font-size="13">answer</text>
      <text x="400" y="132" fill="var(--fg)" font-size="14">2 x 4</text>
      <path d="M280 152 L280 164" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="130" y="166" width="60" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="160" y="190" text-anchor="middle" fill="var(--fg)">24</text>
      <rect x="190" y="166" width="60" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="220" y="190" text-anchor="middle" fill="var(--fg)">12</text>
      <rect x="250" y="166" width="60" height="36" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="190" text-anchor="middle" fill="var(--fg)">8</text>
      <rect x="310" y="166" width="60" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="340" y="190" text-anchor="middle" fill="var(--fg)">6</text>
    </g>
  </g>
</svg>
```

```narrate
Read the rows from the top. [[numbers]] Here are the numbers, and we focus on the three. [[left]] The second row holds the product of everything to the left of each position. For the three, that is one times two, which is two. The first position has nothing on its left, so its value is one. [[right]] The third row is the product of everything to the right. For the three, that is just four. [[answer]] Multiply the two rows, column by column. Two times four is eight, the answer for the three.
```

## One pass each way, no extra table

You do not need to store the left and right rows separately.

1. **Left to right:** write the running left product into the output array
2. **Right to left:** multiply each output slot by a running right product, held in one variable

Both running products start at `1`, because the product of **nothing** is `1`. Total: `O(n)` time and `O(1)` extra memory. The output array does not count.

> **Trap:** order of the two steps inside each loop. First use the running product, **then** multiply the current number into it. Do it backwards and a number ends up in its own answer.

```quiz
q: What should the running product be before position 0, where nothing is on the left?
options:
  - 0
  - 1
  - the first number
answer: 1
why: The product of nothing is 1. A starting value of 0 would turn every answer into 0.
```

```narrate
The two rows do not need their own storage. Walk left to right and write the running left product into the output. Then walk right to left, and multiply each slot by a single running right product. Both start at one, because the product of nothing is one. The order matters inside each loop: use the running value first, and only then fold in the current number.
```

## Your turn

Implement `productExceptSelf(numbers)` in `productExceptSelf.ts`.

- Two loops, no division, no nested loops
- The tests send 100,000 numbers, with zeros and negatives too
- Return a new array. Do not change `numbers`

```hint
Start with an output array as long as the input. You can fill it with `numbers.map(() => 1)`.
```

```hint
First loop, left to right: keep `productToTheLeft = 1`. Store it in the output slot, then multiply the current number into it.
```

```hint
Second loop, right to left: keep `productToTheRight = 1`. Multiply it into the output slot with `*=`, then multiply the current number into it.
```
