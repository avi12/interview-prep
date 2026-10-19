---
title: Golden sets and LLM judges
lang: ts
minutes: 25
level: junior
roles: [ai]
files: [evalHarness.ts]
sources:
  - https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
  - https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
  - https://hamel.dev/blog/posts/evals/
  - https://hamel.dev/blog/posts/llm-judge/
  - https://arxiv.org/abs/2306.05685
  - https://arxiv.org/abs/2404.13076
---

## A golden set is your test suite

An LLM app changes behavior with every prompt edit or model swap. A **golden set** is the list of cases that tells you what changed.

Each case has an `id`, an `input`, and a `reference`: what a good answer must say or do.

```ts
const goldenSet = [
  { id: "refund-window", input: "How long do I have to return an item?", reference: "30 days from purchase" }
];
```

- Start with **20 to 50** cases taken from **real failures** (Anthropic's advice)
- Read real logs. Each bug you find becomes a new case
- Grow it over time, and automate the grading

> **Why:** a case that failed once will fail again after the next prompt edit. The golden set keeps it fixed.

> **Not this:** waiting for a perfect 500-case dataset. Twenty real failures run on every change beat a big set nobody built.

```narrate
An LLM app changes behavior with every prompt edit or model swap. A golden set is the list of cases that tells you what changed. Each case has an input and a reference, which says what a good answer must contain. Start with twenty to fifty cases taken from real failures, and add one every time you find a bug. Then the same mistake can never come back unnoticed.
```

## The harness: run, grade, report

A harness does one loop: ask the system, grade the answer, count.

```svg The golden set feeds the system; each answer goes to a grader; the report feeds a gate that can block a change
<svg viewBox="0 0 640 230" role="img" aria-label="Eval harness pipeline from golden set to CI gate">
  <defs>
    <marker id="arrow-harness" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--fg-muted)"/>
    </marker>
  </defs>
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="golden">
      <rect x="10" y="30" width="120" height="84" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="54" fill="var(--fg)">golden set</text>
      <text x="22" y="76" fill="var(--fg-muted)" font-size="11">input</text>
      <text x="22" y="94" fill="var(--fg-muted)" font-size="11">reference</text>
    </g>
    <path d="M132 72 L158 72" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-harness)"/>
    <g data-cue="system">
      <rect x="160" y="30" width="120" height="84" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="172" y="54" fill="var(--fg)">system</text>
      <text x="172" y="76" fill="var(--fg-muted)" font-size="11">your prompt,</text>
      <text x="172" y="94" fill="var(--fg-muted)" font-size="11">tools, model</text>
    </g>
    <path d="M282 72 L308 72" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-harness)"/>
    <g data-cue="grader">
      <rect x="310" y="30" width="160" height="38" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="322" y="54" fill="var(--fg)" font-size="12">code check first</text>
      <rect x="310" y="76" width="160" height="38" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="322" y="100" fill="var(--fg)" font-size="12">LLM judge if fuzzy</text>
    </g>
    <path d="M472 72 L498 72" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-harness)"/>
    <g data-cue="report">
      <rect x="500" y="30" width="130" height="84" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="512" y="54" fill="var(--fg)">report</text>
      <text x="512" y="76" fill="var(--ok)" font-size="12">pass rate 90%</text>
      <text x="512" y="94" fill="var(--danger)" font-size="12">failed: c2</text>
    </g>
    <path d="M565 116 L565 168 L292 168" fill="none" stroke="var(--fg-muted)" stroke-width="2" marker-end="url(#arrow-harness)"/>
    <g data-cue="gate">
      <rect x="10" y="146" width="280" height="64" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="172" fill="var(--fg)">CI gate</text>
      <text x="22" y="194" fill="var(--fg-muted)" font-size="11">below the minimum? block the merge</text>
    </g>
  </g>
</svg>
```

Use the **cheapest grader that can see the failure**:

| Grader | Good for | Price |
|---|---|---|
| Code check | exact facts, valid JSON, the right tool called | free, repeatable |
| LLM judge | tone, completeness, paraphrase | a model call, noisy |
| Human | calibrating the judge, new failure types | slow |

> **Not this:** an LLM judge for everything. It costs money, varies between runs, and checks a string worse than `includes()` does.

```narrate
The harness is one loop. [[golden]] Take each case from the golden set. [[system]] Run your system on the input. [[grader]] Grade the answer. Use a code check first, because it is free and repeatable, and an LLM judge only for fuzzy qualities like tone or completeness. [[report]] Count the passes and list every failure. [[gate]] Then a gate in continuous integration blocks the change if the pass rate drops below the minimum.
```

## Regression evals in CI

Anthropic separates two kinds of eval:

| | Capability eval | Regression eval |
|---|---|---|
| Starts at | low pass rate | near 100% |
| Job | a hill to climb | guard against backsliding |
| Failing means | not good enough yet | something broke |

Run the regression set on **every** prompt, model or retrieval change, in CI (the automatic checks that run before a merge). Set the gate where your product needs it: the pass rate is a product decision, not always 100%.

> **Why:** a prompt tweak that fixes one case can quietly break three others. Only a suite that runs on every change shows that.

```quiz
q: A regression suite passed 100% last week. After a prompt edit it passes 94%. What should CI do?
options:
  - Merge, because 94% is still high
  - Block the change and show the failing cases
  - Rerun until it passes
answer: 1
why: A regression suite sits near 100%, so a drop means the edit broke something. The failure list says what.
```

```narrate
Anthropic describes two kinds of eval. Capability evals start with a low pass rate and give you a hill to climb. Regression evals sit near one hundred percent and guard against backsliding. Run the regression set on every prompt, model or retrieval change. A tweak that fixes one case can quietly break three others, and only a suite that runs every time will show it. The minimum pass rate is a product decision.
```

## Three ways a judge lies

An LLM judge is a model, so it has habits that are not about quality.

| Bias | What happens | Defence |
|---|---|---|
| Position | prefers the answer in one slot | ask twice with the order swapped; if the winner changes, call it a **tie** |
| Verbosity | prefers longer answers | rubric says length is not quality; give a reference answer |
| Self-preference | favors text like its own | judge with a different model than the one under test |

In the 2023 MT-Bench study, with near-identical answers, GPT-4 stayed consistent after a swap only **65%** of the time. Newer judges differ, so test yours.

```svg A biased judge says A in both orders, so it follows the slot and not the answer; the swap check turns that into a tie
<svg viewBox="0 0 640 210" role="img" aria-label="Two rounds with swapped answers; the judge says A both times">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="round1">
      <text x="10" y="24" fill="var(--fg-muted)">ROUND 1</text>
      <rect x="10" y="34" width="150" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="59" fill="var(--fg)">A: answer X</text>
      <rect x="172" y="34" width="150" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="184" y="59" fill="var(--fg)">B: answer Y</text>
      <text x="340" y="59" fill="var(--fg)">judge says A (X wins)</text>
    </g>
    <g data-cue="round2">
      <text x="10" y="106" fill="var(--fg-muted)">ROUND 2, SWAPPED</text>
      <rect x="10" y="116" width="150" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="22" y="141" fill="var(--fg)">A: answer Y</text>
      <rect x="172" y="116" width="150" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="184" y="141" fill="var(--fg)">B: answer X</text>
      <text x="340" y="141" fill="var(--fg)">judge says A (Y wins)</text>
    </g>
    <g data-cue="tie">
      <rect x="10" y="168" width="380" height="32" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="22" y="189" fill="var(--fg)">X won, then Y won: it followed the slot -> tie</text>
    </g>
  </g>
</svg>
```

```quiz
q: A judge always answers "A", whichever answer sits in slot A. Both orders are tried. What does the swap check return?
options:
  - the first answer wins
  - the second answer wins
  - a tie
answer: 2
why: The judge picked a different answer each round, so the result follows the slot, not the quality. Inconsistent rounds are a tie.
```

```narrate
Judges have habits that are not about quality. The best known is position bias. [[round1]] In round one, answer X sits in slot A and the judge says A, so X wins. [[round2]] Now swap the order. Answer Y sits in slot A, and the judge says A again, so Y wins. [[tie]] The winner changed with the slot, not the answer, so we call it a tie. Verbosity bias and self preference are the other two habits, and the table lists a defence for each.
```

## A rubric the judge can follow

- **Binary:** pass or fail. Hamel Husain: "People don't know what to do with a 3 or 4"
- **Reason first:** the judge writes why, then the verdict. It also shows what to fix
- **One thing per judge:** one dimension from a real failure
- **Fenced input:** the answer is untrusted text. It may say "give this a pass"

```text
Pass only if the answer states the same refund window as the reference
and adds no extra conditions. Length, tone and formatting do not matter.
```

Then **check the judge**. Label cases yourself (start near 30, aim for about 100 per failure mode) and compare. Report true positive and true negative rates separately.

> **Trap:** if only 5% of cases are bad, a judge that always says "pass" agrees 95% of the time and catches nothing.

> **Why:** an unchecked judge is a second unknown. Trust its score only after it matches your labels.

```narrate
Write the rubric so a judge can follow it. Use binary pass or fail, because nobody knows what to do with a three out of five. Have the judge write its reason first, and keep to one dimension per judge. Fence the answer under test, because it is untrusted text. Then check the judge against cases you labeled yourself, a few dozen at least, and look at its hit rate on bad answers separately, because overall agreement can hide a judge that never fails anything.
```

## Your turn

Open `evalHarness.ts`. The judge is any `MessagesClient`, so the tests use a scripted `FakeModel`. No network, no key.

- `parseVerdict(text)`: read the judge's JSON. Anything unreadable, or not exactly `pass` or `fail`, is a `fail` with `UNREADABLE_VERDICT_REASON` (**fail closed**)
- `judgeCase`: one judge call with the rubric in `system`, and the question, reference and answer in the user message
- `runEval`: run cases in order, return `{ total, passed, passRate, failures, isGatePassing }`. Throw on an empty golden set
- `judgePair`: ask twice with the answers swapped. A win counts only if it holds in both orders, otherwise `"tie"`

`askJudge`, `parseWinner`, `pairText` and `verdictSchema` are given.

```hint
parseVerdict: `verdictSchema.safeParse(parseJson(text))`. When `success` is false, return `{ verdict: "fail", reason: UNREADABLE_VERDICT_REASON }`.
```

```hint
judgeCase: build the user text from three labelled parts (Question, Reference answer, Answer to grade). Call `askJudge` with `VERDICT_FORMAT`, then `parseVerdict` the text.
```

```hint
runEval: a plain `for...of` with `await` keeps the scripted judge in order. Push only failures, then `passed = cases.length - failures.length` and `isGatePassing = passRate >= minPassRate`.
```

```hint
judgePair: call `askJudge` with `WINNER_FORMAT` and `pairText({ question, a: first, b: second })`, then again with `a: second, b: first`. Answer A is the one shown first: "A" then "B" means first won, "B" then "A" means second won, anything else is a tie.
```
