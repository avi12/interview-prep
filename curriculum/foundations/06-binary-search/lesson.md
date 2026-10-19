---
title: Binary Search
lang: py
minutes: 20
level: junior
roles: [backend, analyst, ai]
files: [binary_search.py]
sources:
  - https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/
  - https://en.wikipedia.org/wiki/Binary_search
  - https://docs.python.org/3/library/bisect.html
---

## The problem

`nums` is sorted from small to large, with no repeats. Find `target`. Return its **index**, or `-1` if it is not there.

- `search([-1, 0, 3, 5, 9, 12], 9)` returns `4`
- `search([-1, 0, 3, 5, 9, 12], 2)` returns `-1`

Interviewers ask for `O(log n)`. This is the most common place to lose points on small bugs, so the lesson is about **why the bugs happen**.

```narrate
You get a sorted list of numbers and a target. Return the position of the target, or minus one if it is missing. The interviewer wants logarithmic time, and this problem is famous for small mistakes, so we will also look at why they happen.
```

## Sorted means you can skip

A linear scan checks items one by one: **O(n)**. A sorted array tells you more. Look at the middle:

- Too small: the target cannot be on the left. Drop the left half
- Too big: drop the right half
- Equal: done

Half the array disappears with every look. That is **O(log n)**.

| Items | Linear scan, worst case | Binary search, worst case |
|---|---|---|
| 1,000 | 1,000 looks | 10 looks |
| 1,000,000 | 1,000,000 looks | 20 looks |
| 1,000,000,000 | 1,000,000,000 looks | 30 looks |

> **Why:** sorted order is information, and each look uses it to rule out half of what is left.

> **Not this:** scanning a sorted array. It is correct, but it ignores the one fact you were given. The tests hand you a billion-item array that exists only on paper, and count your reads.

```narrate
A plain scan checks items one by one. But the array is sorted, and that is extra information. Look at the middle. If it is too small, everything on its left is too small as well, so drop the left half. Too big, drop the right half. Each look halves the problem, so a billion items need only about thirty looks.
```

```quiz
q: About how many looks does binary search need, at most, for 1,000,000 sorted items?
options:
  - 20
  - 1,000
  - 500,000
answer: 0
why: Halving 1,000,000 down to 1 takes about 20 steps, because 2 to the power of 20 is just over a million.
```

## Halve the range

Keep two markers, `low` and `high`: the part of the array that could still hold the target.

Each look compares the middle item with `target`, then moves `low` or `high` past the middle.

```svg Looking for 13 in eight sorted numbers: three looks, each one throws away half of what is left
<svg viewBox="0 0 520 236" role="img" aria-label="Three steps of binary search narrowing the range">
  <g font-family="var(--font-mono)" font-size="16" text-anchor="middle">
    <g data-cue="step1">
      <text x="8" y="43" text-anchor="start" font-size="12" fill="var(--fg-muted)">look 1</text>
      <rect x="130" y="20" width="42" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="151" y="41" fill="var(--fg)">1</text>
      <rect x="178" y="20" width="42" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="199" y="41" fill="var(--fg)">3</text>
      <rect x="226" y="20" width="42" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="247" y="41" fill="var(--fg)">5</text>
      <rect x="274" y="20" width="42" height="30" fill="var(--primary-container)" stroke="var(--primary)" stroke-width="3"/>
      <text x="295" y="41" fill="var(--fg)">7</text>
      <rect x="322" y="20" width="42" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="343" y="41" fill="var(--fg)">9</text>
      <rect x="370" y="20" width="42" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="391" y="41" fill="var(--fg)">11</text>
      <rect x="418" y="20" width="42" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="439" y="41" fill="var(--fg)">13</text>
      <rect x="466" y="20" width="42" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="487" y="41" fill="var(--fg)">15</text>
      <text x="151" y="68" font-size="13" fill="var(--accent-2)">low</text>
      <text x="487" y="68" font-size="13" fill="var(--accent-2)">high</text>
    </g>
    <g data-cue="step2">
      <text x="8" y="113" text-anchor="start" font-size="12" fill="var(--fg-muted)">look 2</text>
      <rect x="130" y="90" width="42" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="151" y="111" fill="var(--fg-muted)">1</text>
      <rect x="178" y="90" width="42" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="199" y="111" fill="var(--fg-muted)">3</text>
      <rect x="226" y="90" width="42" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="247" y="111" fill="var(--fg-muted)">5</text>
      <rect x="274" y="90" width="42" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="295" y="111" fill="var(--fg-muted)">7</text>
      <rect x="322" y="90" width="42" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="343" y="111" fill="var(--fg)">9</text>
      <rect x="370" y="90" width="42" height="30" fill="var(--primary-container)" stroke="var(--primary)" stroke-width="3"/>
      <text x="391" y="111" fill="var(--fg)">11</text>
      <rect x="418" y="90" width="42" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="439" y="111" fill="var(--fg)">13</text>
      <rect x="466" y="90" width="42" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="487" y="111" fill="var(--fg)">15</text>
      <text x="343" y="138" font-size="13" fill="var(--accent-2)">low</text>
      <text x="487" y="138" font-size="13" fill="var(--accent-2)">high</text>
    </g>
    <g data-cue="step3">
      <text x="8" y="183" text-anchor="start" font-size="12" fill="var(--fg-muted)">look 3</text>
      <rect x="130" y="160" width="42" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="151" y="181" fill="var(--fg-muted)">1</text>
      <rect x="178" y="160" width="42" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="199" y="181" fill="var(--fg-muted)">3</text>
      <rect x="226" y="160" width="42" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="247" y="181" fill="var(--fg-muted)">5</text>
      <rect x="274" y="160" width="42" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="295" y="181" fill="var(--fg-muted)">7</text>
      <rect x="322" y="160" width="42" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="343" y="181" fill="var(--fg-muted)">9</text>
      <rect x="370" y="160" width="42" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="391" y="181" fill="var(--fg-muted)">11</text>
      <rect x="418" y="160" width="42" height="30" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="4"/>
      <text x="439" y="181" fill="var(--fg)">13</text>
      <rect x="466" y="160" width="42" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="487" y="181" fill="var(--fg)">15</text>
      <text x="439" y="208" font-size="13" fill="var(--accent-2)">low</text>
      <text x="487" y="208" font-size="13" fill="var(--accent-2)">high</text>
    </g>
  </g>
</svg>
```

```narrate
Look for thirteen in eight sorted numbers. [[step1]] Low is the first slot, high is the last, and the middle holds seven. Seven is too small, so everything on its left is out. [[step2]] Low jumps past the middle. The new middle holds eleven. Still too small. [[step3]] One more jump, and the middle holds thirteen. Found, after three looks instead of seven.
```

## One rule stops off-by-one bugs

Off-by-one bugs come from **mixed meanings**: `high` is the last index in one line and one past it in another. Pick one meaning and say it:

> The target, if it exists, is somewhere in `low..high`, **both included**.

Then check every line against that rule:

- Start with the whole array: `low = 0`, `high = len(nums) - 1`
- Loop while `low <= high`: one item left still needs a look
- After a look, step **past** the middle: `middle + 1` or `middle - 1`

> **Why:** a written rule turns each line into a yes or no check. This rule is called a **loop invariant**.

> **Not this:** add and subtract 1 until the tests pass. You fix one input and break another.

```narrate
Off-by-one bugs come from mixing two meanings of the same variable. So pick one and say it out loud: the target, if it exists, is between low and high, both included. Now every line is a yes or no question. The loop must run while low is less than or equal to high, because one item left still needs a look. And after looking at the middle, step past it, because it has just been ruled out.
```

```quiz
q: low is 2 and high is 2, so one item is left. Which loop condition still looks at it?
options:
  - low < high
  - low <= high
answer: 1
why: With both ends included, a range where low equals high still holds one item that could be the target.
```

## Four classic bugs

| Bug | What happens |
|---|---|
| `while low < high` | the last one-item range is never checked |
| `low = middle`, no `+ 1` | `middle` never moves: an endless loop |
| `high = len(nums)` with `<=` | reads `nums[len(nums)]`: `IndexError` |
| slicing `nums[:middle]` | copies half the array on every call: back to `O(n)` |

> **Trap:** in Java or C++, `(low + high) / 2` overflows when the sum passes the largest integer. Write `low + (high - low) // 2`. That bug sat in a widely used library for years.

```narrate
Four classic bugs. A loop that uses less-than instead of less-than-or-equal skips the last item. Forgetting the plus one when moving low gives an endless loop. A high that starts one too far reads past the end. And slicing the array copies it, which throws the speed away. One more, from Java and C plus plus: adding low and high can overflow, so write low plus half the gap instead.
```

## Your turn

Implement `search(nums, target)` in `binary_search.py`.

- Closed range `low..high`, loop `while low <= high`
- Return `-1` when the range runs out

The tests try every size from 0 to 40 with every target inside and between the numbers. Then they hand you a **billion-item array that exists only on paper**, count your reads, and stop you at 100. A linear scan and slicing both fail.

```hint
Start with `low = 0` and `high = len(nums) - 1`, then `while low <= high:`.
```

```hint
Inside the loop: `middle = low + (high - low) // 2`. Read `nums[middle]` once into a variable and compare it with `target`.
```

```hint
Equal: `return middle`. Too small: `low = middle + 1`. Too big: `high = middle - 1`. After the loop, `return -1`.
```
