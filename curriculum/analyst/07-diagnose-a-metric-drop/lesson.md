---
title: Diagnose a metric drop
lang: none
minutes: 20
level: junior
roles: [analyst]
sources:
  - https://prachub.com/resources/data-science-case-study-interview
  - https://mandyliu.substack.com/p/how-would-you-investigate-a-20-drop
  - https://dataanalysis.substack.com/p/analytical-case-study-on-user-engagement
---

## The case you will get

The interviewer says: **"Daily orders dropped 10% this week. What do you do?"**

There is no secret cause to guess. They score your **order of thinking**:

- Ask before you answer
- Rule out the boring causes first
- Narrow down with data, not guesses
- End with a recommendation and a number

Open with your plan in one sentence, then follow it.

```narrate
Here is the question you will get. Daily orders dropped ten percent this week. What do you do? There is no secret cause to guess. The interviewer is listening to your order of thinking. Ask before you answer, rule out the boring causes first, narrow down with data instead of guesses, and finish with a recommendation and a number. Open by saying your plan in one sentence, then follow it.
```

## The five steps

```svg The answer as a decision tree: clarify, check the data, find the slice, name the cause family, recommend
<svg viewBox="0 0 520 330" role="img" aria-label="Decision tree for diagnosing a metric drop">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 Z" fill="var(--accent-2)"/>
    </marker>
  </defs>
  <g data-cue="clarify" font-family="var(--font-mono)" font-size="12">
    <rect x="20" y="20" width="150" height="46" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="95" y="40" text-anchor="middle" fill="var(--fg)">1 Clarify</text>
    <text x="95" y="57" text-anchor="middle" fill="var(--fg-muted)">metric, size, when</text>
    <path d="M170 43 L188 43" stroke="var(--accent-2)" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
  </g>
  <g data-cue="check" font-family="var(--font-mono)" font-size="12">
    <rect x="190" y="20" width="150" height="46" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="265" y="40" text-anchor="middle" fill="var(--fg)">2 Data real?</text>
    <text x="265" y="57" text-anchor="middle" fill="var(--fg-muted)">check a 2nd source</text>
    <path d="M265 66 L265 108" stroke="var(--accent-2)" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
    <text x="274" y="92" fill="var(--ok)">yes</text>
  </g>
  <g data-cue="fix" font-family="var(--font-mono)" font-size="12">
    <path d="M340 43 L358 43" stroke="var(--danger)" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
    <text x="344" y="36" fill="var(--danger)">no</text>
    <rect x="360" y="20" width="140" height="46" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
    <text x="430" y="40" text-anchor="middle" fill="var(--fg)">Fix tracking</text>
    <text x="430" y="57" text-anchor="middle" fill="var(--fg-muted)">restate the number</text>
  </g>
  <g data-cue="segment" font-family="var(--font-mono)" font-size="12">
    <rect x="190" y="110" width="150" height="46" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="265" y="130" text-anchor="middle" fill="var(--fg)">3 Segment</text>
    <text x="265" y="147" text-anchor="middle" fill="var(--fg-muted)">which slice fell?</text>
    <path d="M240 156 L150 196" stroke="var(--accent-2)" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
    <path d="M290 156 L380 196" stroke="var(--accent-2)" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
  </g>
  <g data-cue="narrow" font-family="var(--font-mono)" font-size="12">
    <rect x="40" y="200" width="200" height="46" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="140" y="220" text-anchor="middle" fill="var(--fg)">4a One slice fell</text>
    <text x="140" y="237" text-anchor="middle" fill="var(--fg-muted)">release, payment, event</text>
    <rect x="280" y="200" width="200" height="46" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="380" y="220" text-anchor="middle" fill="var(--fg)">4b All slices fell</text>
    <text x="380" y="237" text-anchor="middle" fill="var(--fg-muted)">season, market, outage</text>
  </g>
  <g data-cue="recommend" font-family="var(--font-mono)" font-size="12">
    <path d="M140 246 L220 276" stroke="var(--accent-2)" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
    <path d="M380 246 L300 276" stroke="var(--accent-2)" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
    <rect x="170" y="280" width="180" height="40" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="3"/>
    <text x="260" y="298" text-anchor="middle" fill="var(--fg)">5 Recommend</text>
    <text x="260" y="313" text-anchor="middle" fill="var(--fg-muted)">cause, size, next step</text>
  </g>
</svg>
```

```narrate
Read the tree from the top left. [[clarify]] First clarify the metric, how big the drop is, and when it started. [[check]] Then ask whether the data is right, by comparing a second source. [[fix]] If tracking is broken, stop and fix the number. [[segment]] If the drop is real, find which slice fell: platform, country, new or returning users. [[narrow]] One slice points to a release, a payment problem or a local event. Every slice falling points to season, market or an outage. [[recommend]] Finish with the cause, its size, and the next step.
```

> **Why:** check the data first. A broken tracker makes every later step an answer to a question nobody asked.

> **Not this:** jump to "maybe a competitor launched a sale". A guess with no segment behind it is the most common way to fail this question.

## Clarify, then check the data

| Ask | Why it matters |
|---|---|
| How is the metric defined, over which window? | "Active" or "order" may have changed |
| How big, and sudden or gradual? | Sudden fits a release or a bug. Gradual fits the market |
| Compared with what? | Same weekday last week, same period last year |
| Any release, tracking or pipeline change? | Check the release log first |
| Does a second source agree? | Finance, payments, server logs |

> **Trap:** compare like with like. A holiday Monday against ordinary Mondays should look different, and that is not an incident.

```narrate
Before any analysis, ask questions. How is the metric defined, and over what window? How big is the drop, and was it sudden or gradual? Compared with what: the same weekday last week, or the same period last year, so a holiday does not fool you? Was there a release, a tracking change, or a pipeline problem? And does a second source, like finance or payments, show the same drop? Only then trust the number.
```

## Segment, then split the metric

**Segment before you theorize.** The shape of the drop points to the cause.

| Pattern | Likely cause |
|---|---|
| One platform or app version | a release bug |
| One country or payment method | a local event or payment problem |
| Every slice equally | measurement, outage, season |
| Slow slide over weeks | market or product fit |

Then split the metric: orders = visitors x conversion x orders per buyer. Which factor moved? A slice's **contribution** = its share x its change.

```svg Last week 100 orders, this week 90: iOS fell from 25 to 15 and explains the whole drop
<svg viewBox="0 0 520 200" role="img" aria-label="Orders by platform, last week and this week">
  <g data-cue="before" font-family="var(--font-mono)" font-size="12">
    <text x="14" y="58" fill="var(--fg-muted)">last week</text>
    <rect x="110" y="40" width="90" height="28" fill="var(--cat-1)" stroke="var(--border)" stroke-width="2"/>
    <text x="155" y="58" text-anchor="middle" fill="var(--fg)">iOS 25</text>
    <rect x="200" y="40" width="180" height="28" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="290" y="58" text-anchor="middle" fill="var(--fg)">Android 50</text>
    <rect x="380" y="40" width="90" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="425" y="58" text-anchor="middle" fill="var(--fg)">web 25</text>
  </g>
  <g data-cue="after" font-family="var(--font-mono)" font-size="12">
    <text x="14" y="118" fill="var(--fg-muted)">this week</text>
    <rect x="110" y="100" width="54" height="28" fill="var(--cat-1)" stroke="var(--border)" stroke-width="2"/>
    <text x="137" y="118" text-anchor="middle" fill="var(--fg)">iOS 15</text>
    <rect x="164" y="100" width="180" height="28" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="254" y="118" text-anchor="middle" fill="var(--fg)">Android 50</text>
    <rect x="344" y="100" width="90" height="28" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="389" y="118" text-anchor="middle" fill="var(--fg)">web 25</text>
  </g>
  <g data-cue="gap" font-family="var(--font-mono)" font-size="13">
    <rect x="434" y="100" width="36" height="28" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="110" y="168" fill="var(--danger)">iOS: 25% share x -40% = -10 points of the -10%</text>
  </g>
</svg>
```

```narrate
Compare two bars. [[before]] Last week there were one hundred orders: twenty five from i O S, fifty from Android, twenty five from the web. [[after]] This week there are ninety. Android and the web did not move, but i O S fell from twenty five to fifteen. [[gap]] The dashed box is the missing ten. A quarter share that fell forty percent is ten points, which is the entire drop.
```

```quiz
q: Total orders fell 10%. iOS is 25% of orders and fell 40%. Everything else is flat. How much of the drop does iOS explain?
options:
  - about a quarter of it
  - all of it
  - none, 40% is larger than 10%
answer: 1
why: Contribution is share x change, so 25% x 40% = 10 points. That is the whole 10% drop.
```

## Recommend with a number

Lead with the answer, then the proof. Five short sentences:

1. **Punchline:** "Orders are down 10%, and all of it is iOS."
2. **Evidence:** "iOS conversion fell from 3.0% to 1.8% right after release 4.2. Android and web are flat."
3. **Confidence:** "High. Timing and platform both match. I have not read the crash logs yet."
4. **Action:** "Roll back or hotfix 4.2, and I will check checkout errors today."
5. **Reversal:** "If Android drops too, it is not the release."

> **Why:** a number, an action, and "what would change my mind" sound like someone who will own the problem.

```narrate
Finish with a recommendation, punchline first. Say what happened: orders are down ten percent, all of it on i O S. Give the proof: conversion on i O S fell from three percent to one point eight right after the release, while the other platforms are flat. State your confidence, and what you have not checked yet. Name the action. And say what would change your mind. That last sentence is what separates a recommendation from a list of causes.
```

## Say it aloud

Set a timer for **90 seconds**. No notes. Say this out loud, then listen back if you can record it:

> "Weekly active users fell 8% last week. How would you investigate?"

Cover, in order:

1. Your plan in one sentence
2. Two clarifying questions
3. The first data check
4. Three slices to cut by
5. One likely cause per pattern
6. A recommendation with a number

```narrate
Now your turn to talk. Set a timer for ninety seconds and answer out loud, with no notes. The question: weekly active users fell eight percent last week, how would you investigate? Cover six things in order. Your plan in one sentence. Two clarifying questions. The first data check. Three slices to cut by. One likely cause for each pattern. And a recommendation with a number. Then listen back and check that you gave the plan first.
```

```hint
Open with: "I will check the drop is real, find where it happened, look for causes, and end with a recommendation."
```

```hint
Clarify with: "How is active defined, and did it or the tracking change? Is 8% unusual for this week, for example a holiday?"
```

```hint
Close with: "Most likely this is X, because the drop is only in Y. I would confirm with Z, and if it also shows up in W I would rethink."
```
