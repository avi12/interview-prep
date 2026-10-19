---
title: Solving a Problem Live
lang: none
minutes: 10
level: junior
roles: [backend, analyst, ai]
sources:
  - https://www.techinterviewhandbook.org/coding-interview-prep/
  - https://www.techinterviewhandbook.org/coding-interview-cheatsheet/
  - https://books.codepath.org/student-handbook/technical-interviewing/anatomy-of-an-interview
---

## Why a routine

In a coding round, the interviewer scores more than the final code. The Tech Interview Handbook lists four things: **communication**, **problem solving**, **technical competency** and **testing**. Only one of them is typing.

A fixed routine makes the other three automatic. You always know your next move, even when you are nervous, and the interviewer can follow your thinking.

> **Why:** a silent candidate with a correct answer gives the interviewer only the output to score. Thinking out loud turns your reasoning into points.

> **Not this:** typing the first idea you have. Both guides put questions and a plan before the first line of code.

```narrate
In a coding interview, the code is only one part of the score. The interviewer also grades how you communicate, how you solve problems, and how you test. A routine covers all of that. When you are nervous, you do not have to decide what to do next. You just follow the steps, and say them out loud so the interviewer can follow you.
```

## The six steps

Do them in this order, every time. Each step ends with one spoken sentence.

```svg The six steps of a coding round, in order, with the short phrase to remember for each
<svg viewBox="0 0 520 326" role="img" aria-label="Six steps: restate, examples, brute force, optimize, code, test">
  <g font-family="var(--font-mono)">
    <g data-cue="restate">
      <rect x="20" y="12" width="480" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <circle cx="44" cy="32" r="13" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="44" y="37" text-anchor="middle" fill="var(--fg)" font-size="14">1</text>
      <text x="70" y="37" fill="var(--fg)" font-size="15">Restate</text>
      <text x="200" y="37" fill="var(--fg-muted)" font-size="13">say it back in your words</text>
    </g>
    <g data-cue="examples">
      <path d="M44 52 L44 64" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="20" y="64" width="480" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <circle cx="44" cy="84" r="13" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="44" y="89" text-anchor="middle" fill="var(--fg)" font-size="14">2</text>
      <text x="70" y="89" fill="var(--fg)" font-size="15">Examples</text>
      <text x="200" y="89" fill="var(--fg-muted)" font-size="13">one normal, one edge case</text>
    </g>
    <g data-cue="brute">
      <path d="M44 104 L44 116" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="20" y="116" width="480" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <circle cx="44" cy="136" r="13" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="44" y="141" text-anchor="middle" fill="var(--fg)" font-size="14">3</text>
      <text x="70" y="141" fill="var(--fg)" font-size="15">Brute force</text>
      <text x="200" y="141" fill="var(--fg-muted)" font-size="13">simple, correct, name its cost</text>
    </g>
    <g data-cue="optimize">
      <path d="M44 156 L44 168" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="20" y="168" width="480" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <circle cx="44" cy="188" r="13" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="44" y="193" text-anchor="middle" fill="var(--fg)" font-size="14">4</text>
      <text x="70" y="193" fill="var(--fg)" font-size="15">Optimize</text>
      <text x="200" y="193" fill="var(--fg-muted)" font-size="13">find the repeated work</text>
    </g>
    <g data-cue="code">
      <path d="M44 208 L44 220" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="20" y="220" width="480" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <circle cx="44" cy="240" r="13" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="44" y="245" text-anchor="middle" fill="var(--fg)" font-size="14">5</text>
      <text x="70" y="245" fill="var(--fg)" font-size="15">Code</text>
      <text x="200" y="245" fill="var(--fg-muted)" font-size="13">narrate as you type</text>
    </g>
    <g data-cue="test">
      <path d="M44 260 L44 272" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="20" y="272" width="480" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <circle cx="44" cy="292" r="13" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="44" y="297" text-anchor="middle" fill="var(--fg)" font-size="14">6</text>
      <text x="70" y="297" fill="var(--fg)" font-size="15">Test</text>
      <text x="200" y="297" fill="var(--fg-muted)" font-size="13">trace an example by hand</text>
    </g>
  </g>
</svg>
```

```narrate
Six steps, from the top. [[restate]] First, restate the problem in your own words and ask questions. [[examples]] Second, make an example, plus one edge case. [[brute]] Third, say the simple brute force solution and what it costs. [[optimize]] Fourth, look for the repeated work and remove it. [[code]] Fifth, write the code while you explain it. [[test]] Sixth, trace an example through your code by hand, then try the edge cases.
```

> **Why:** step 3 comes before step 4 on purpose. The brute force proves you understand the problem, gives you a working fallback, and shows the cost you are about to remove.

## What to say out loud

Thinking silently is invisible. Use these as sentence starters, shown here for Two Sum.

| Step | Say out loud |
|---|---|
| Restate | "So I get a list and a target, and return two indexes. Can the list be empty? Can numbers repeat?" |
| Examples | "For 2, 7, 11, 15 and target 9 the answer is 0 and 1. Edge case: 3, 3 with target 6." |
| Brute force | "Simplest idea: check every pair. That is O(n squared), fine for small input, slow for big." |
| Optimize | "I repeat the search for a partner. A map can remember what I have seen: O(n) time, O(n) memory." |
| Code | "Map first, then one loop. This line asks whether the partner is already in the map." |
| Test | "Tracing the first example: at 7 I need 2, and it is in the map. Now an empty list." |

> **Trap:** asking no questions. The Handbook says to ask at least two or three clarifying questions before coding.

```narrate
Here is what the routine sounds like for Two Sum. Restating includes real questions, like whether the list can be empty. For examples, give one normal case and one edge case. For brute force, name the cost in big O terms. For optimizing, say what work repeats and what you will remember instead. While coding, explain each line as you write it. While testing, trace by hand, out loud.
```

## When you are stuck

You will get stuck. Silence is the worst response. Say what you know, then shrink the problem.

- "I am stuck on how to avoid the second loop. Let me try a smaller example."
- Fall back to the brute force you already stated
- It is much better to finish a working slower solution than to leave an optimal one half written

> **Not this:** going quiet for several minutes. The interviewer cannot help you, and cannot score thinking they cannot hear.

```quiz
q: You finished typing your code and the interviewer says nothing. What is the right next move?
options:
  - say "done" and wait
  - trace one example by hand, then try edge cases
  - start rewriting it faster
answer: 1
why: Testing is part of the score. Trace an example out loud, then an empty input and a repeated value, and fix what you find.
```

```narrate
Everyone gets stuck. The skill is how you behave when it happens. Say what you are stuck on, then shrink the problem with a smaller example. If nothing comes, fall back to the brute force you already stated. A working slower answer beats an unfinished fast one. And when you finish typing, do not say done. Trace an example out loud, then the edge cases.
```

## Practice it

Do this once with each lesson in this track.

1. Pick a problem. Set a timer for 10 minutes
2. Without touching the keyboard, say steps 1 to 4 out loud
3. Then code and test, still talking
4. Record it on your phone and listen once

Aim for one spoken sentence per step. Short and clear beats long and complete.

```narrate
Practice is how the routine becomes automatic. Pick any problem from this track and set a timer. Say the first four steps out loud before you touch the keyboard. Then code and test while still talking. Record yourself, and listen once. You will hear the long silences, and that is the part to fix first.
```
