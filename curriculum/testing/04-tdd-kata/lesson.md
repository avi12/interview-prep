---
title: TDD kata - Roman numerals
lang: ts
minutes: 25
level: junior
roles: [backend, analyst, ai]
files: [roman.ts]
sources:
  - https://martinfowler.com/bliki/TestDrivenDevelopment.html
  - https://codingdojo.org/kata/RomanNumerals/
  - https://en.wikipedia.org/wiki/Roman_numerals
  - https://osherove.com/tdd-kata-1
---

## Red, green, refactor

**Test-driven development** (TDD) means you write the test **before** the code. You repeat one small loop:

- **Red:** write a test for the next tiny behavior. Watch it fail
- **Green:** write just enough code to pass
- **Refactor:** clean up while the tests stay green

```svg The TDD loop. Each lap adds one small behavior
<svg viewBox="0 0 520 200" role="img" aria-label="Red, green, refactor loop">
  <g font-family="var(--font-mono)" font-size="13" text-anchor="middle">
    <g data-cue="red">
      <rect x="20" y="20" width="150" height="76" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="95" y="50" fill="var(--fg)" font-size="16">RED</text>
      <text x="95" y="74" fill="var(--fg-muted)">failing test</text>
    </g>
    <path d="M172 58 L196 58 M188 51 L196 58 L188 65" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <g data-cue="green">
      <rect x="200" y="20" width="150" height="76" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="2"/>
      <text x="275" y="50" fill="var(--fg)" font-size="16">GREEN</text>
      <text x="275" y="74" fill="var(--fg-muted)">simplest pass</text>
    </g>
    <path d="M352 58 L376 58 M368 51 L376 58 L368 65" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <g data-cue="refactor">
      <rect x="380" y="20" width="120" height="76" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="440" y="50" fill="var(--fg)" font-size="16">REFACTOR</text>
      <text x="440" y="74" fill="var(--fg-muted)">tidy, stay green</text>
    </g>
    <g data-cue="again">
      <path d="M440 98 L440 150 L95 150 L95 100 M88 108 L95 100 L102 108" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="268" y="174" fill="var(--fg)">next behavior, next lap</text>
    </g>
  </g>
</svg>
```

```narrate
The loop has three steps. [[red]] Red: write a tiny test for behavior that does not exist yet, and watch it fail. [[green]] Green: write just enough code to make it pass, nothing more. [[refactor]] Refactor: tidy the code while the tests protect you. [[again]] Then start the next lap with the next small behavior.
```

> **Why:** only one thing is new at a time, so when a test goes red you know which change did it.

> **Not this:** write the whole function, then add tests. A failure could come from any line, and you will skip the awkward cases.

## Be lazy on purpose

The kata: `toRoman(value)` turns 1 into `I`, 4 into `IV`, 1994 into `MCMXCIV`.

Test 1 says `toRoman(1)` is `"I"`. It is red because the code returns `""`. The laziest green is:

```ts
export function toRoman(value: number) {
  return "I";
}
```

Test 2 says `toRoman(2)` is `"II"`. Red again, so the code must grow:

```ts
export function toRoman(value: number) {
  return "I".repeat(value);
}
```

A second example **forces** the real rule. Fowler lists this as part of the craft: choose the next test well.

```narrate
Start lazy on purpose. The first test only needs the letter I, so return the letter I. That is honest, and it is green. The second test, two, breaks that shortcut, so now the code has to repeat the letter. Each new example pushes the code a little closer to the real rule, and you never write code that no test asked for.
```

## Let the tests pull the rule out

Fives and subtraction arrive in the next stages. When 4 and 9 appear, ifs pile up. Look for the **pattern** instead: take the biggest numeral that fits, write it, subtract its value, repeat.

```svg Converting 14: take the biggest piece that fits, subtract, repeat
<svg viewBox="0 0 520 170" role="img" aria-label="Greedy conversion of 14">
  <g font-family="var(--font-mono)" font-size="14" text-anchor="middle">
    <g data-cue="biggest">
      <rect x="20" y="24" width="140" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="90" y="48" fill="var(--fg)">left: 14</text>
      <text x="90" y="68" fill="var(--fg-muted)">biggest fit: X (10)</text>
    </g>
    <path d="M162 50 L196 50 M188 43 L196 50 L188 57" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <g data-cue="subtract">
      <rect x="200" y="24" width="140" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="270" y="48" fill="var(--fg)">left: 4</text>
      <text x="270" y="68" fill="var(--fg-muted)">biggest fit: IV (4)</text>
    </g>
    <path d="M342 50 L376 50 M368 43 L376 50 L368 57" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <g data-cue="done">
      <rect x="380" y="24" width="120" height="54" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="440" y="48" fill="var(--fg)">left: 0</text>
      <text x="440" y="68" fill="var(--fg-muted)">XIV</text>
    </g>
    <text x="20" y="130" text-anchor="start" fill="var(--fg)">data, not ifs: a list of (value, numeral) pairs</text>
  </g>
</svg>
```

```narrate
Look at fourteen. [[biggest]] The biggest piece that fits is ten, written X. [[subtract]] That leaves four, and the biggest piece that fits there is the pair I V. [[done]] Nothing is left, so the answer is X I V. The rule is the same at every step, so it can live in a list of pairs instead of a tangle of ifs.
```

> **Why:** the six subtractive pairs (IV, IX, XL, XC, CD, CM) are just more rows in the list, so the loop never changes.

## Refactor is not optional

Fowler: "the most common way to screw up TDD is neglecting the third step." Green means you may tidy:

- Remove duplication
- Replace magic numbers with names
- Make the loop read like the rule

Do it **only while green**. The tests are your safety net, and a net with a hole catches nothing.

```narrate
Refactoring is the step people skip, and skipping it is the most common way to ruin test-driven development. When the tests are green, you are allowed to tidy: remove duplication, give numbers names, make the code read like the rule. Do it only while green, because a red test means the safety net has a hole.
```

```quiz
q: A new test just went green. What is the next move?
options:
  - immediately write the next failing test
  - tidy the code while the tests are green
  - delete the test, it already did its job
answer: 1
why: Green is the moment refactoring is safe. Clean up first, then start the next lap.
```

## Your turn

Open `roman.ts` and implement `toRoman(value)` for whole numbers from 1 to 3999.

- Only six subtractive pairs exist: IV, IX, XL, XC, CD, CM
- Anything else (0, negative, 4000, 1.5) throws a `RangeError`

The tests come in **7 stages**. Work like TDD: run `pnpm lesson test testing/04-tdd-kata`, find the **first** red stage, make only that pass, tidy, repeat. Stage 6 checks all 3999 numbers, so hard-coding the examples fails.

```hint
Stages 1 and 2 only need a loop of repeats. Do not look at stage 3 yet.
```

```hint
Once 4 and 9 appear, stop adding ifs. Make a list of pairs, biggest value first: 1000 M, 900 CM, and so on.
```

```hint
For each pair, append the numeral as many times as the value fits into what is left (`Math.floor(left / size)`), then keep the remainder (`left % size`). Add the range check last, for stage 7.
```
