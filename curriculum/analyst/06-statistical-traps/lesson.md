---
title: Statistical traps
lang: none
minutes: 20
level: junior
roles: [analyst]
sources:
  - https://plato.stanford.edu/entries/paradox-simpson/
  - https://en.wikipedia.org/wiki/Simpson%27s_paradox
  - https://en.wikipedia.org/wiki/Survivorship_bias
  - https://en.wikipedia.org/wiki/Correlation_does_not_imply_causation
  - https://en.wikipedia.org/wiki/Multiple_comparisons_problem
  - https://en.wikipedia.org/wiki/Data_dredging
---

## Simpson's paradox

A trend in the whole data can **reverse** inside every group. Kidney stone study, success rates:

| | Treatment A | Treatment B |
|---|---|---|
| Small stones | 93% (81/87) | 87% (234/270) |
| Large stones | 73% (192/263) | 69% (55/80) |
| Everyone | 78% (273/350) | 83% (289/350) |

A wins in both groups, yet B wins overall. The mix is different: A was given mostly the hard large stones (263 of 350), B mostly the easy small ones (270 of 350).

```svg A beats B for small stones and for large stones, but B is ahead when the two groups are merged
<svg viewBox="0 0 520 230" role="img" aria-label="Success rates of two treatments by stone size and overall">
  <g font-family="var(--font-mono)" font-size="12">
    <rect x="20" y="12" width="14" height="14" fill="var(--cat-1)"/>
    <text x="40" y="24" fill="var(--fg)">treatment A</text>
    <rect x="150" y="12" width="14" height="14" fill="var(--cat-2)"/>
    <text x="170" y="24" fill="var(--fg)">treatment B</text>
    <path d="M20 170 L480 170" stroke="var(--border)" stroke-width="2" fill="none"/>
  </g>
  <g data-cue="small" font-family="var(--font-mono)" font-size="12">
    <rect x="40" y="58" width="40" height="112" fill="var(--cat-1)" stroke="var(--border)" stroke-width="2"/>
    <text x="60" y="52" text-anchor="middle" fill="var(--fg)">93%</text>
    <rect x="90" y="66" width="40" height="104" fill="var(--cat-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="110" y="60" text-anchor="middle" fill="var(--fg)">87%</text>
    <text x="85" y="190" text-anchor="middle" fill="var(--fg)">small stones</text>
    <text x="85" y="208" text-anchor="middle" fill="var(--fg-muted)" font-size="11">81/87 vs 234/270</text>
  </g>
  <g data-cue="large" font-family="var(--font-mono)" font-size="12">
    <rect x="200" y="82" width="40" height="88" fill="var(--cat-1)" stroke="var(--border)" stroke-width="2"/>
    <text x="220" y="76" text-anchor="middle" fill="var(--fg)">73%</text>
    <rect x="250" y="87" width="40" height="83" fill="var(--cat-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="270" y="81" text-anchor="middle" fill="var(--fg)">69%</text>
    <text x="245" y="190" text-anchor="middle" fill="var(--fg)">large stones</text>
    <text x="245" y="208" text-anchor="middle" fill="var(--fg-muted)" font-size="11">192/263 vs 55/80</text>
  </g>
  <g data-cue="combined" font-family="var(--font-mono)" font-size="12">
    <rect x="360" y="76" width="40" height="94" fill="var(--cat-1)" stroke="var(--border)" stroke-width="2"/>
    <text x="380" y="70" text-anchor="middle" fill="var(--fg)">78%</text>
    <rect x="410" y="70" width="40" height="100" fill="var(--cat-2)" stroke="var(--danger)" stroke-width="3"/>
    <text x="430" y="64" text-anchor="middle" fill="var(--fg)">83%</text>
    <text x="405" y="190" text-anchor="middle" fill="var(--fg)">everyone</text>
    <text x="405" y="208" text-anchor="middle" fill="var(--fg-muted)" font-size="11">273/350 vs 289/350</text>
  </g>
</svg>
```

```narrate
Look at the bars from left to right. [[small]] For small stones, treatment A succeeds ninety three percent of the time and B eighty seven. [[large]] For large stones, A wins again, seventy three to sixty nine. [[combined]] But merge everyone and B jumps ahead, eighty three to seventy eight. The reason is the mix: A was given most of the hard, large stones, and B mostly the easy small ones.
```

> **Why:** stone size affects both who gets which treatment and who recovers. That third variable (a **confounder**) decides: compare within each size.

> **Not this:** "always trust the total", or "always trust the split". Which table is right depends on how the data was produced. Do not split on something the treatment itself causes.

```quiz
q: A patient has a large stone. Which treatment do the numbers favour?
options:
  - B, because its overall rate (83%) is higher
  - A, because within large stones it wins 192/263 against 55/80
  - neither, the data contradicts itself
answer: 1
why: Compare like with like. For large stones A succeeds 73% of the time and B 69%. The overall rate mixes easy and hard cases.
```

## Survivorship bias

You only see what **survived** the filter. In WWII, analysts studied bullet holes on bombers that came back. Reinforcing only those spots ignores the planes hit elsewhere that never returned.

Same trap in business: a fund list shows today's funds. Closed funds are gone, so past returns look better than they were.

> **Trap:** surveying only current customers. The unhappy ones already left, so satisfaction looks great.

```svg Four funds closed after losing 20%. A list of survivors shows +10%, all ten funds averaged -2%
<svg viewBox="0 0 520 220" role="img" aria-label="Ten funds, six survivors and four closed">
  <g data-cue="survivors" font-family="var(--font-mono)" font-size="13">
    <circle cx="50" cy="50" r="16" fill="var(--ok)"/>
    <circle cx="94" cy="50" r="16" fill="var(--ok)"/>
    <circle cx="138" cy="50" r="16" fill="var(--ok)"/>
    <circle cx="182" cy="50" r="16" fill="var(--ok)"/>
    <circle cx="226" cy="50" r="16" fill="var(--ok)"/>
    <circle cx="270" cy="50" r="16" fill="var(--ok)"/>
    <path d="M34 82 L286 82" stroke="var(--ok)" stroke-width="2" fill="none"/>
    <text x="34" y="102" fill="var(--fg)">6 survivors: +10% each</text>
  </g>
  <g data-cue="closed" font-family="var(--font-mono)" font-size="13">
    <circle cx="314" cy="50" r="16" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="4 3"/>
    <circle cx="358" cy="50" r="16" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="4 3"/>
    <circle cx="402" cy="50" r="16" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="4 3"/>
    <circle cx="446" cy="50" r="16" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="4 3"/>
    <path d="M298 82 L462 82" stroke="var(--danger)" stroke-width="2" fill="none"/>
    <text x="298" y="102" fill="var(--fg)">4 closed: -20% each</text>
  </g>
  <g data-cue="average" font-family="var(--font-mono)" font-size="14">
    <text x="34" y="150" fill="var(--fg)">list of survivors: average +10%</text>
    <text x="34" y="178" fill="var(--danger)">all 10: (6 x 10 - 4 x 20) / 10 = -2%</text>
  </g>
</svg>
```

```narrate
Ten funds started the year. [[survivors]] Six survived, each up ten percent. [[closed]] Four lost twenty percent and were closed, so they vanished from the list. [[average]] Look only at the list and the average is plus ten percent. Count all ten and it is minus two percent. The question to ask is always: who is missing from this data?
```

```quiz
q: A list shows 6 funds averaging +10%. Four more funds lost 20% each and were closed. What was the average of all 10?
options:
  - +10%
  - +2%
  - -2%
answer: 2
why: (6 x 10 + 4 x (-20)) / 10 = (60 - 80) / 10 = -2%.
```

## Correlation is not causation

When X and Y move together, there are four stories: X causes Y, **Y causes X**, a hidden **third thing causes both**, or pure coincidence.

| Pattern | Example | Check |
|---|---|---|
| Common cause | ice cream sales and drownings both rise in hot weather | what could drive both? |
| Reverse | windmills spin faster when the wind is stronger | which moved first? |
| Coincidence | two trends line up by chance | does it hold on new data? |

```svg Hot weather drives both ice cream sales and drownings, so they move together without either causing the other
<svg viewBox="0 0 520 230" role="img" aria-label="A hidden cause behind two correlated measures">
  <g data-cue="cause" font-family="var(--font-mono)" font-size="14">
    <rect x="190" y="20" width="140" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="260" y="45" text-anchor="middle" fill="var(--fg)">hot weather</text>
    <path d="M225 62 L120 146" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    <polygon points="120,146 133.3,144.3 126.7,134.3" fill="var(--accent-2)"/>
    <path d="M295 62 L400 146" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    <polygon points="400,146 386.7,144.3 393.3,134.3" fill="var(--accent-2)"/>
  </g>
  <g data-cue="pair" font-family="var(--font-mono)" font-size="14">
    <rect x="40" y="150" width="170" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="125" y="175" text-anchor="middle" fill="var(--fg)">ice cream sales</text>
    <rect x="310" y="150" width="170" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="395" y="175" text-anchor="middle" fill="var(--fg)">drownings</text>
  </g>
  <g data-cue="link" font-family="var(--font-mono)" font-size="11">
    <path d="M212 170 L308 170" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
    <text x="260" y="162" text-anchor="middle" fill="var(--danger)">move together</text>
    <text x="260" y="192" text-anchor="middle" fill="var(--danger)">no cause</text>
  </g>
</svg>
```

```narrate
Start at the top. [[cause]] Hot weather pushes people toward the ice cream stand and also into the water. [[pair]] So ice cream sales and drownings both rise in summer. [[link]] They move together, which is a correlation, but neither one causes the other. In an interview, when you hear that two things go together, ask what else could be driving both, and say that only an experiment can settle cause.
```

> **Why:** an A/B test breaks the hidden link, because a coin flip, not weather or motivation, decides who gets the change.

```quiz
q: Users who tried a new feature retain at 60%, others at 30%. What is the best next step?
options:
  - ship the feature to everyone, it doubles retention
  - give it to a random half of users and compare
  - ignore it, correlation is meaningless
answer: 1
why: Engaged users may be the ones who find the feature. Randomly assigning it removes that choice and shows the real effect.
```

## Many tests, one lucky p-value

Each test at 5% significance has a 5% chance of a false alarm. Run **20** tests where nothing is real:

- Expected false alarms: 20 x 0.05 = **1**
- Chance of at least one: 1 - 0.95^20 = **64%**

**p-hacking** is trying metrics, slices or stopping points until one crosses 0.05, and reporting only that one.

```svg Twenty tests, nothing real: one square lights up by luck
<svg viewBox="0 0 520 230" role="img" aria-label="Twenty tests with one false alarm">
  <g data-cue="grid" font-family="var(--font-mono)" font-size="13">
    <rect x="40" y="30" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="84" y="30" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="128" y="30" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="172" y="30" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="216" y="30" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="260" y="30" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="304" y="30" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="348" y="30" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="392" y="30" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="436" y="30" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="40" y="74" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="84" y="74" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="128" y="74" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="172" y="74" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="216" y="74" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="260" y="74" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="348" y="74" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="392" y="74" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <rect x="436" y="74" width="30" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
  </g>
  <g data-cue="lucky" font-family="var(--font-mono)" font-size="13">
    <rect x="304" y="74" width="30" height="30" fill="var(--danger)" stroke="var(--border)" stroke-width="2"/>
    <text x="319" y="128" text-anchor="middle" fill="var(--danger)">p = 0.03!</text>
  </g>
  <g data-cue="chance" font-family="var(--font-mono)" font-size="14">
    <text x="40" y="170" fill="var(--fg)">expected false alarms: 20 x 0.05 = 1</text>
    <text x="40" y="198" fill="var(--danger)">chance of at least one: 1 - 0.95^20 = 64%</text>
  </g>
</svg>
```

```narrate
Each square is one test where nothing real is going on. [[grid]] Twenty tests, and we expect about one false alarm. [[lucky]] Here it is, a result with a p value of zero point zero three. If you only report this one, it looks like a discovery. [[chance]] The chance that at least one of twenty empty tests fires is sixty four percent. Slicing the data until something lights up is not analysis.
```

> **Why:** Bonferroni divides the bar by the number of tests: 20 tests means each must beat 0.05 / 20 = 0.0025. Better still, decide the metric and slices **before** you look, and confirm on fresh data.

> **Not this:** slice by country, device and day until something is significant, then report only that. Say how many things you tried.

```quiz
q: You test 6 independent metrics at 5% significance and none has a real effect. What is the chance at least one looks significant?
options:
  - 5%
  - 26%
  - 30%
answer: 1
why: 1 - 0.95^6 = 0.265. The 30% figure is only an upper bound (6 x 5%).
```

## What to say out loud

| Trap | Ask | Say |
|---|---|---|
| Simpson | Does the group mix differ between the two sides? | "Let me split by that group before comparing." |
| Survivorship | Who is missing from this data? | "This only covers current users, so churned ones are invisible." |
| Correlation | What else could drive both? | "That is a correlation. An experiment would show the cause." |
| Many tests | How many things were tried? | "Adjust for the number of tests, or confirm on new data." |

```narrate
When you meet a surprising number, run four checks out loud. Does the mix of groups differ between the two sides? If so, split before comparing. Who is missing from the data? Churned users and failed companies leave no trace. What else could drive both measures? Only an experiment shows cause. And how many things were tried? Adjust for the count, or confirm on new data. Naming the trap calmly is what interviewers listen for.
```
