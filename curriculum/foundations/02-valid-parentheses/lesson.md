---
title: Valid Parentheses
lang: py
minutes: 15
level: junior
roles: [backend, analyst, ai]
files: [valid_parentheses.py]
sources:
  - https://docs.python.org/3/tutorial/datastructures.html#using-lists-as-stacks
  - https://www.bigocheatsheet.com/
---

## The problem

A string contains only `()[]{}`. Return `True` if every bracket is closed by the **same kind**, in the **right order**.

- `"([]){}"` is valid
- `"(]"` is not: wrong kind
- `"([)]"` is not: wrong order
- `"(("` is not: never closed

```narrate
Given a string of brackets, say whether it is balanced. Every opener needs the right closer, and they must close in the right order.
```

## The last opened must close first

Read left to right. When you see a closer, it must match the **most recent** opener that is still open. "Most recent first" is exactly what a **stack** does.

- Opener: push it
- Closer: pop and compare
- End: the stack must be empty

```svg Checking ([]): push (, push [, then ] pops [, then ) pops (
<svg viewBox="0 0 520 170" role="img" aria-label="Stack of open brackets">
  <g font-family="var(--font-mono)" font-size="18">
    <g data-cue="push">
      <rect x="40" y="110" width="50" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="65" y="137" text-anchor="middle" fill="var(--fg)">(</text>
      <rect x="40" y="66" width="50" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="65" y="93" text-anchor="middle" fill="var(--fg)">[</text>
      <text x="40" y="40" fill="var(--fg-muted)" font-size="13">stack, top is up</text>
    </g>
    <g data-cue="pop">
      <path d="M130 88 L200 88" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="215" y="94" fill="var(--fg)" font-size="15">next char ] closes [ : pop, match</text>
    </g>
    <g data-cue="empty">
      <text x="215" y="140" fill="var(--fg)" font-size="15">at the end: stack empty -> valid</text>
    </g>
  </g>
</svg>
```

```narrate
Picture a stack of plates. [[push]] Each opener goes on top. [[pop]] A closer must match the plate on top, so we take it off and compare. [[empty]] If the string ends and the stack is empty, everything was matched.
```

> **Why:** a stack remembers **order**, and order is the whole problem.

> **Not this:** one counter per bracket type. It accepts `([)]`, because the counts balance while the order is wrong.

## Edge cases that fail people

```narrate
Two edge cases trip people up. A closer that arrives when nothing is open, which would crash a pop. And a string that ends with openers still waiting, which the loop alone does not catch.
```

> **Trap:** a closer arrives and the stack is **empty**. Popping crashes. Check first: no opener means invalid, return early.

> **Trap:** the string ends with openers left over, like `"(("`. The loop finishes without a mismatch. Return `not stack`, not `True`.

```quiz
q: What does the stack hold after reading "([" ?
options:
  - empty
  - ( and [ with [ on top
  - only [
answer: 1
why: Nothing has been closed yet, so both openers wait, and the most recent one is on top.
```

## Your turn

Implement `is_valid(text)` in `valid_parentheses.py`.

- Use a `dict` that maps each closer to its opener, so there is no chain of `if`
- Early return on the first mismatch

```hint
PAIRS = {")": "(", "]": "[", "}": "{"}
```

```hint
Loop over the characters. If it is in PAIRS (a closer), pop and compare. Otherwise push it.
```

```hint
When the stack is empty or the popped value is not PAIRS[char], return False right away. After the loop, return not stack.
```
