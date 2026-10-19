---
title: Big-O in Plain Words
lang: none
minutes: 12
level: junior
roles: [backend, analyst, ai]
sources:
  - https://www.bigocheatsheet.com/
  - https://en.wikipedia.org/wiki/Big_O_notation
  - https://wiki.python.org/moin/TimeComplexity
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
---

## What Big-O measures

Big-O answers one question: **when the input grows, how much more work does my code do?**

- It counts **steps**, not seconds
- It describes **growth**, not exact speed
- `n` is the size of the input: items in a list, characters in a string

A fast laptop and a slow phone take different seconds for the same code. They take the same number of steps.

> **Why:** steps survive a change of machine, language and load. A stopwatch only measures your laptop today.

> **Not this:** "I ran it and it was fast." Fast on 10 items says nothing about 10 million.

```narrate
Big-O answers one question. When the input gets bigger, how much more work does my code do? It counts steps, not seconds, because seconds change with the machine and steps do not. The letter n is just the size of the input. Big-O describes the shape of the growth, not the exact speed.
```

## The handful of growth rates

Six shapes cover almost everything. Read each one as: **what happens to the work if the input doubles?**

- `O(1)` constant: nothing changes
- `O(log n)` logarithmic: one extra step
- `O(n)` linear: the work doubles
- `O(n log n)` linearithmic: a little more than double
- `O(n²)` quadratic: the work quadruples
- `O(2ⁿ)` exponential: the work is squared

```svg Steps needed for 16 items: each bar is four times the one above, until exponential runs off the page
<svg viewBox="0 0 600 256" role="img" aria-label="Bar chart of steps for sixteen items per growth rate">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="constant">
      <text x="8" y="31" fill="var(--fg)">O(1)</text>
      <rect x="130" y="14" width="1.5" height="24" fill="var(--ok)"/>
      <text x="142" y="31" fill="var(--fg)">1</text>
    </g>
    <g data-cue="log">
      <text x="8" y="71" fill="var(--fg)">O(log n)</text>
      <rect x="130" y="54" width="6" height="24" fill="var(--ok)"/>
      <text x="146" y="71" fill="var(--fg)">4</text>
    </g>
    <g data-cue="linear">
      <text x="8" y="111" fill="var(--fg)">O(n)</text>
      <rect x="130" y="94" width="24" height="24" fill="var(--primary)"/>
      <text x="164" y="111" fill="var(--fg)">16</text>
    </g>
    <g data-cue="nlogn">
      <text x="8" y="151" fill="var(--fg)">O(n log n)</text>
      <rect x="130" y="134" width="96" height="24" fill="var(--primary)"/>
      <text x="236" y="151" fill="var(--fg)">64</text>
    </g>
    <g data-cue="quadratic">
      <text x="8" y="191" fill="var(--fg)">O(n^2)</text>
      <rect x="130" y="174" width="384" height="24" fill="var(--accent-2)"/>
      <text x="524" y="191" fill="var(--fg)">256</text>
    </g>
    <g data-cue="exponential">
      <text x="8" y="231" fill="var(--fg)">O(2^n)</text>
      <path d="M590 214 L130 214 L130 238 L590 238" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="142" y="231" fill="var(--fg)">65,536 steps: off the page</text>
    </g>
  </g>
</svg>
```

```narrate
Here is how many steps each growth rate needs when the input has sixteen items. [[constant]] Constant is one step, however big the input gets. [[log]] Logarithmic is four steps, the trick of halving the problem each time. [[linear]] Linear is sixteen steps, one per item. [[nlogn]] N log n is sixty-four steps, the cost of a good sort. [[quadratic]] Quadratic is two hundred fifty-six steps, a loop inside a loop. [[exponential]] And exponential is sixty-five thousand five hundred thirty-six steps, already off the page.
```

```quiz
q: The input doubles from 1,000 to 2,000 items. The work goes from 1 million steps to about 4 million. Which growth rate is this?
options:
  - linear
  - n log n
  - quadratic
answer: 2
why: Doubling the input quadruples the work, and that is what n squared does.
```

## Read it off the code

| Code shape | Steps | Big-O |
|---|---|---|
| one loop over the input | n | O(n) |
| two loops, one after the other | n + n | O(n) |
| a loop inside a loop | n × n | O(n²) |
| a loop, then a nested loop | n + n² | O(n²) |
| cut the problem in half each step | log n | O(log n) |
| sort the input first | n log n | O(n log n) |

Three rules:

- **Drop constants.** `2n` and `100n` are both O(n)
- **Keep the biggest term.** `n² + n` is O(n²)
- **In a row, add. Inside, multiply.**

> **Why:** at a million items, the `+ n` next to `n²` is a rounding error. Only the fastest-growing part decides the outcome.

> **Not this:** "Two loops, so O(n²)." Loops in a row **add**. Only nested loops multiply.

> **Trap:** two different inputs get two letters. A loop over `rows` inside a loop over `columns` is O(rows × columns), not O(n²).

```narrate
You can read the cost straight off the code. One loop is linear. Two loops one after the other are still linear, because the steps add up to two n and we drop the constant. A loop inside a loop multiplies, so it is quadratic. Cutting the problem in half each step is logarithmic. And when two different inputs are involved, give each its own letter.
```

## Time and space

Two costs, two questions:

- **Time**: how many steps?
- **Space**: how much **extra** memory, beyond the input?

Recursion counts as space, because every waiting call sits on the call stack.

Often you trade one for the other. The Two Sum lesson spends `O(n)` memory on a map to turn `O(n²)` time into `O(n)`.

```svg Time and space are separate bills: one pass with a map cuts the time and grows the memory
<svg viewBox="0 0 520 196" role="img" aria-label="Nested loops compared with one pass and a map">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="before">
      <text x="30" y="30" fill="var(--fg-muted)">nested loops</text>
      <rect x="30" y="44" width="130" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="95" y="69" text-anchor="middle" fill="var(--fg)">time O(n^2)</text>
      <rect x="30" y="104" width="130" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="95" y="129" text-anchor="middle" fill="var(--fg)">space O(1)</text>
    </g>
    <g data-cue="after">
      <text x="330" y="30" fill="var(--fg-muted)">one pass + map</text>
      <rect x="330" y="44" width="160" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="410" y="69" text-anchor="middle" fill="var(--fg)">time O(n)</text>
      <rect x="330" y="104" width="160" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="410" y="129" text-anchor="middle" fill="var(--fg)">space O(n)</text>
    </g>
    <g data-cue="trade">
      <path d="M170 64 L320 64" stroke="var(--ok)" stroke-width="3"/>
      <path d="M320 64 L308 57 M320 64 L308 71" stroke="var(--ok)" stroke-width="3"/>
      <text x="196" y="54" fill="var(--fg)" font-size="12">time drops</text>
      <path d="M170 124 L320 124" stroke="var(--danger)" stroke-width="3"/>
      <path d="M320 124 L308 117 M320 124 L308 131" stroke="var(--danger)" stroke-width="3"/>
      <text x="186" y="114" fill="var(--fg)" font-size="12">memory grows</text>
      <text x="30" y="182" fill="var(--fg)">spend memory, save time</text>
    </g>
  </g>
</svg>
```

```narrate
Time and space are two separate bills. [[before]] Take nested loops: quadratic time, and almost no extra memory. [[after]] Now one pass with a map: linear time, but the map grows with the input, so the space is linear too. [[trade]] We spent memory to buy time. Say that trade out loud and the interviewer knows you see it.
```

> **Why:** interviewers rarely want the fastest code at any price. They want you to see the trade and say which side you chose.

> **Not this:** counting the input itself as space. The array you were given is free. Only what you add counts.

```quiz
q: A function copies the input array, sorts the copy, and returns the middle item. How much extra space does it use?
options:
  - O(1)
  - O(n)
  - O(n log n)
answer: 1
why: The copy holds n items, so the extra memory grows in step with n.
```

## Costs worth memorizing

| Operation | Cost |
|---|---|
| read a list or array item by index | O(1) |
| append to the end of a list | O(1) amortized |
| `x in list`, or search an unsorted array | O(n) |
| insert at the front or middle of a list | O(n) |
| `key in dict`, Map or Set lookup | O(1) on average |
| sort a list or array | O(n log n) |
| binary search in a sorted array | O(log n) |

**Amortized** means averaged over many calls: an append is sometimes slow because the list must grow, but almost always one step.

These answer most "what does this line cost?" questions.

> **Trap:** `x in list` looks like one step, but it loops inside. Put it in a loop over `n` items and the whole function is O(n²) by accident.

> **Trap:** hash lookups are O(1) on **average**. If many keys land in the same slot (a collision), one lookup can slow toward O(n). Say "on average" out loud.

```narrate
Memorize this short list. Reading by index is constant. Searching a plain list is linear. Looking up a key in a dictionary or a map is constant on average. Sorting is n log n. And watch out for hidden loops: the word in on a list loops inside, so putting it inside your own loop makes the whole function quadratic by accident.
```

```quiz
q: Inside a loop over n items you write `if x in items` on a Python list. What is the total cost?
options:
  - O(n)
  - O(n²)
  - O(log n)
answer: 1
why: Each `in` scans the list, which is n steps, and you do it n times.
```

## Say it out loud

When you finish a solution, say its cost in one sentence:

1. Name `n`: "n is the number of prices"
2. Give the time and the reason: "O(n), I loop once"
3. Give the extra space and the reason: "O(1), two variables"
4. Name the trade, if there is one

Start with the brute force and its cost. Then say how you cut it.

> **Why:** naming the cost shows you can see it before the interviewer points at it. "Can you do better?" is your cue to move on.

> **Not this:** "It's pretty fast", or "it's O(n)" with no `n`. Linear in what?

```narrate
When you finish a solution, say its cost in one sentence. Name what n is. Give the time and why. Give the extra space and why. For example: n is the number of prices. It is linear time, because I loop once. It uses constant extra space, because I keep two variables. Start with the brute force and its cost, then say how you improve on it.
```
