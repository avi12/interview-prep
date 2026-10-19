---
title: Climbing Stairs and Dynamic Programming
lang: ts
minutes: 20
level: junior
roles: [backend, analyst, ai]
files: [climbStairs.ts]
sources:
  - https://en.wikipedia.org/wiki/Dynamic_programming
  - https://en.wikipedia.org/wiki/Memoization
  - https://neetcode.io/solutions/climbing-stairs
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
---

## The problem

A staircase has `n` steps. Each move climbs **1 or 2** steps. In how many different ways can you reach the top?

- `climbStairs(1)` is `1`
- `climbStairs(2)` is `2`: `1+1` or `2`
- `climbStairs(3)` is `3`: `1+1+1`, `1+2`, `2+1`
- `n` is from 1 to 45

```narrate
You stand at the bottom of a staircase with n steps. Each move takes one step or two. Count the different ways to reach the top. It looks like a puzzle, but it is the gentlest introduction to dynamic programming, which interviewers love to ask about.
```

## The idea, and the slow version

Look at your **last** move. It came from step `n - 1` with a 1-step, or from step `n - 2` with a 2-step. So:

`ways(n) = ways(n - 1) + ways(n - 2)`

with `ways(1) = 1` and `ways(2) = 2`. Written straight from that rule:

```ts
function ways(step: number): number {
  if (step <= 2) return step;
  return ways(step - 1) + ways(step - 2);
}
```

It is correct. It is also extremely slow.

> **Why:** a problem fits dynamic programming when the answer is built from answers to smaller versions of the same problem, and the same small versions come up again and again.

```narrate
Think about the very last move. You either came from the step just below, or from two steps below. So the number of ways is the sum of those two smaller answers. Writing that rule as a recursive function is the natural first step. It is correct, and it is the version to say out loud first. Then we look at its cost.
```

## Where the time goes

Draw the calls for `ways(5)`. The same questions are asked again and again.

```svg The call tree of ways(5): ways(3) is computed twice and ways(2) three times, each time from scratch
<svg viewBox="0 0 520 256" role="img" aria-label="Recursion tree of ways(5) with repeated calls highlighted">
  <g font-family="var(--font-mono)" font-size="15">
    <g data-cue="tree">
      <path d="M260 52 L160 74 M260 52 L360 74 M160 110 L110 132 M160 110 L210 132 M360 110 L310 132 M360 110 L410 132 M110 168 L75 190 M110 168 L145 190" stroke="var(--border)" stroke-width="2" fill="none"/>
      <circle cx="260" cy="34" r="18" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="39" text-anchor="middle" fill="var(--fg)">5</text>
      <circle cx="160" cy="92" r="18" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="160" y="97" text-anchor="middle" fill="var(--fg)">4</text>
      <circle cx="360" cy="92" r="18" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="360" y="97" text-anchor="middle" fill="var(--fg)">3</text>
      <circle cx="110" cy="150" r="18" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="110" y="155" text-anchor="middle" fill="var(--fg)">3</text>
      <circle cx="210" cy="150" r="18" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="210" y="155" text-anchor="middle" fill="var(--fg)">2</text>
      <circle cx="310" cy="150" r="18" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="310" y="155" text-anchor="middle" fill="var(--fg)">2</text>
      <circle cx="410" cy="150" r="18" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="410" y="155" text-anchor="middle" fill="var(--fg)">1</text>
      <circle cx="75" cy="208" r="18" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="75" y="213" text-anchor="middle" fill="var(--fg)">2</text>
      <circle cx="145" cy="208" r="18" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="145" y="213" text-anchor="middle" fill="var(--fg)">1</text>
    </g>
    <g data-cue="repeats">
      <circle cx="360" cy="92" r="18" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="3"/>
      <text x="360" y="97" text-anchor="middle" fill="var(--danger)">3</text>
      <circle cx="110" cy="150" r="18" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="3"/>
      <text x="110" y="155" text-anchor="middle" fill="var(--danger)">3</text>
      <circle cx="210" cy="150" r="18" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="3"/>
      <text x="210" y="155" text-anchor="middle" fill="var(--danger)">2</text>
      <circle cx="310" cy="150" r="18" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="3"/>
      <text x="310" y="155" text-anchor="middle" fill="var(--danger)">2</text>
      <circle cx="75" cy="208" r="18" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="3"/>
      <text x="75" y="213" text-anchor="middle" fill="var(--danger)">2</text>
      <text x="400" y="97" fill="var(--danger)" font-size="13">3 twice</text>
      <text x="236" y="202" fill="var(--danger)" font-size="13">2 three times</text>
    </g>
    <g data-cue="cost">
      <text x="20" y="246" fill="var(--fg)" font-size="13">n = 45: about 2.3 billion calls</text>
    </g>
  </g>
</svg>
```

```narrate
Here is the call tree for five steps. [[tree]] Each circle is one call. The root asks for five, which asks for four and three, and so on down. [[repeats]] Look at the red circles. The question for three is asked twice, and the question for two is asked three times, each time from scratch. [[cost]] The repeats multiply at every level, so for forty five steps there are about two point three billion calls.
```

> **Trap:** the number of calls multiplies by about 1.6 for every extra step. It is usually quoted as the simpler upper bound **O(2^n)**. Either way it is exponential: 45 steps already takes seconds and 90 would never finish.

## Remember the answers

Two fixes, same idea: **never solve the same small problem twice**.

- **Memoization** (top-down): keep the recursion. Before computing `ways(step)`, look in a `Map`. After computing, store it. Each step is solved once: `O(n)`
- **Bottom-up** (tabulation): no recursion. Fill a table from the smallest step upward. Each cell is the sum of the two before it: `O(n)`

```svg Bottom-up: start from the known cells and fill to the right, each cell is the sum of the two before it
<svg viewBox="0 0 520 170" role="img" aria-label="A table of ways for steps one to five">
  <g font-family="var(--font-mono)" font-size="16">
    <g data-cue="cells">
      <text x="20" y="40" fill="var(--fg-muted)" font-size="13">step</text>
      <text x="75" y="40" text-anchor="middle" fill="var(--fg-muted)" font-size="13">1</text>
      <text x="165" y="40" text-anchor="middle" fill="var(--fg-muted)" font-size="13">2</text>
      <text x="255" y="40" text-anchor="middle" fill="var(--fg-muted)" font-size="13">3</text>
      <text x="345" y="40" text-anchor="middle" fill="var(--fg-muted)" font-size="13">4</text>
      <text x="435" y="40" text-anchor="middle" fill="var(--fg-muted)" font-size="13">5</text>
      <rect x="40" y="50" width="70" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="75" y="79" text-anchor="middle" fill="var(--fg)">1</text>
      <rect x="130" y="50" width="70" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="165" y="79" text-anchor="middle" fill="var(--fg)">2</text>
      <rect x="220" y="50" width="70" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="255" y="79" text-anchor="middle" fill="var(--fg)">3</text>
      <rect x="310" y="50" width="70" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="345" y="79" text-anchor="middle" fill="var(--fg)">5</text>
    </g>
    <g data-cue="rule">
      <path d="M165 98 L165 114 L335 114 L335 100 M245 98 L245 114 M330 106 L335 98 L340 106" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <text x="40" y="154" fill="var(--fg)" font-size="14">each cell = the two before it</text>
    </g>
    <g data-cue="answer">
      <rect x="400" y="50" width="70" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="435" y="79" text-anchor="middle" fill="var(--fg)">8</text>
      <path d="M265 98 L265 132 L435 132 L435 100 M355 98 L355 132 M430 106 L435 98 L440 106" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    </g>
  </g>
</svg>
```

```narrate
Now the fix. [[cells]] Start from the cells we already know: one way for step one, two ways for step two. [[rule]] Every new cell is the sum of the two cells before it. Step three is one plus two. Step four is two plus three, which is five. [[answer]] Step five is three plus five: eight ways. Each step is computed once, so the work is linear.
```

> **Why:** a cell only needs the two before it, so two variables can replace the whole table. Time stays `O(n)`, memory drops to `O(1)`. Offer that as the follow-up.

> **Not this:** plain recursion as your final answer. It is fine as a first step you say out loud. Then name the repeated calls and fix them.

```quiz
q: In the call tree for ways(5), how many times is ways(2) computed?
options:
  - once
  - twice
  - three times
answer: 2
why: It is called under ways(4), under the left ways(3), and under the right ways(3). Remembering the answer after the first call removes the other two.
```

## Your turn

Implement `climbStairs(n)` in `climbStairs.ts`. The tests ask for 45 steps and give it one second.

- No plain recursion: it makes billions of calls
- Pick either fix: memoization with a `Map`, or a bottom-up table
- Say which one you picked and its time and memory cost

```hint
`n = 1` and `n = 2` are the base cases: the answer is `n`. Return early for them.
```

```hint
Bottom-up: make an array where the index is the step number, start it with the known values, then fill the rest with a loop.
```

```hint
For step 3 and up: `waysByStep[step] = waysByStep[step - 1] + waysByStep[step - 2]`. Return `waysByStep[n]`.
```
