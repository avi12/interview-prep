---
title: A/B test from scratch
lang: py
minutes: 35
level: junior
roles: [analyst]
files: [ab_test.py]
sources:
  - https://en.wikipedia.org/wiki/P-value
  - https://en.wikipedia.org/wiki/Confidence_interval
  - https://en.wikipedia.org/wiki/Two-proportion_Z-test
  - https://stat.ethz.ch/R-manual/R-devel/library/stats/html/power.prop.test.html
  - https://www.evanmiller.org/how-not-to-run-an-ab-test.html
  - https://www.evanmiller.org/ab-testing/sample-size.html
  - https://www.exp-platform.com/Documents/GuideControlledExperiments.pdf
  - https://docs.python.org/3/library/statistics.html
  - https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norm.html
---

## What an A/B test answers

Half the visitors see the old page (control), half see the new one (variant). The **null hypothesis** says the two pages convert equally. Any gap you see is luck.

- **p-value**: if there were truly no difference, how often would luck alone give a gap at least this big?
- **95% confidence interval**: the range of true differences that the data cannot rule out at the 5% level

```svg If there is no real difference, gaps this large (z = 2.5, either direction) happen about 1.2% of the time
<svg viewBox="0 0 520 230" role="img" aria-label="Normal curve with both tails shaded beyond z of 2.5">
  <g data-cue="curve" font-family="var(--font-mono)" font-size="13">
    <path d="M40 170 L53.8 169.9 L67.5 169.7 L81.2 169.4 L95 168.7 L108.8 167.3 L122.5 164.7 L136.2 160.5 L150 153.8 L163.8 144.1 L177.5 131.1 L191.2 115.2 L205 97.4 L218.8 79.7 L232.5 64.4 L246.2 54 L260 50.3 L273.8 54 L287.5 64.4 L301.2 79.7 L315 97.4 L328.8 115.2 L342.5 131.1 L356.2 144.1 L370 153.8 L383.8 160.5 L397.5 164.7 L411.2 167.3 L425 168.7 L438.8 169.4 L452.5 169.7 L466.2 169.9 L480 170" fill="none" stroke="var(--fg)" stroke-width="2"/>
    <path d="M40 170 L480 170" stroke="var(--border)" stroke-width="2" fill="none"/>
    <text x="260" y="34" text-anchor="middle" fill="var(--fg)">the world where nothing changed</text>
    <text x="260" y="190" text-anchor="middle" fill="var(--fg-muted)">0</text>
  </g>
  <g data-cue="observed" font-family="var(--font-mono)" font-size="13">
    <path d="M397.5 164 L397.5 110" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
    <text x="397.5" y="100" text-anchor="middle" fill="var(--fg)">your gap: z = 2.5</text>
    <path d="M122.5 164 L122.5 110" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
    <text x="122.5" y="100" text-anchor="middle" fill="var(--fg)">or -2.5</text>
  </g>
  <g data-cue="tails" font-family="var(--font-mono)" font-size="14">
    <path d="M397.5 164.7 L411.2 167.3 L425 168.7 L438.8 169.4 L452.5 169.7 L466.2 169.9 L480 170 L397.5 170 Z" fill="var(--danger)" stroke="var(--danger)" stroke-width="2"/>
    <path d="M122.5 164.7 L108.8 167.3 L95 168.7 L81.2 169.4 L67.5 169.7 L53.8 169.9 L40 170 L122.5 170 Z" fill="var(--danger)" stroke="var(--danger)" stroke-width="2"/>
    <text x="20" y="216" fill="var(--danger)">p = 0.012: the area of both red tails</text>
  </g>
</svg>
```

```narrate
Picture a world where the new page changed nothing. [[curve]] In that world the gap between the groups wobbles around zero, and this bell shows how big the wobble usually is. [[observed]] Our real gap landed far out on the edge, two and a half units from zero. [[tails]] The red tails are the share of lucky wobbles at least that big, in either direction. That area is the p value, about one point two percent.
```

> **Trap:** p = 0.012 does **not** mean "98.8% chance the variant is better". It says how surprising the gap is if nothing changed.

> **Trap:** a 95% interval does not mean "95% chance the truth is inside this one". It means 95% of intervals built this way would catch the truth.

## The test in six lines

```text
rate_c = x_c / n_c                  rate_v = x_v / n_v
pooled = (x_c + x_v) / (n_c + n_v)
se     = sqrt(pooled * (1 - pooled) * (1/n_c + 1/n_v))
z      = (rate_v - rate_c) / se
p      = 2 * P(Z > |z|)
ci     = (rate_v - rate_c) +/- 1.96 * sqrt(rate_c*(1-rate_c)/n_c + rate_v*(1-rate_v)/n_v)
```

Here `c` is control, `v` is variant, `x` is conversions, `n` is visitors. `se` (standard error) is the typical size of the luck wobble in the gap, and `z` is the gap measured in those units.

Example: 200 of 2,000 buy on control (10%), 250 of 2,000 on variant (12.5%). Lift (variant rate minus control rate) = 2.5 points, z = 2.50, p = 0.012.

> **Why:** the **test** assumes no difference, so both groups share one rate and the best estimate pools everyone. The **interval** assumes nothing, so each group keeps its own rate and its own uncertainty.

> **Not this:** checking whether the two groups' own intervals overlap. They can overlap while the difference is still significant. Test the difference itself.

```svg The lift is +2.5 points. The 95% interval runs from +0.5 to +4.5 and stays clear of zero, which agrees with p below 0.05
<svg viewBox="0 0 520 220" role="img" aria-label="A confidence interval bar that does not cross zero">
  <g data-cue="zero" font-family="var(--font-mono)" font-size="13">
    <path d="M130 50 L130 140" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
    <text x="130" y="40" text-anchor="middle" fill="var(--danger)">0 = no difference</text>
  </g>
  <g data-cue="interval" font-family="var(--font-mono)" font-size="13">
    <rect x="168" y="93" width="274" height="14" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <path d="M168 85 L168 115" stroke="var(--fg)" stroke-width="2" fill="none"/>
    <path d="M442 85 L442 115" stroke="var(--fg)" stroke-width="2" fill="none"/>
    <text x="168" y="134" text-anchor="middle" fill="var(--fg)">+0.5</text>
    <text x="442" y="134" text-anchor="middle" fill="var(--fg)">+4.5</text>
  </g>
  <g data-cue="estimate" font-family="var(--font-mono)" font-size="13">
    <circle cx="305" cy="100" r="7" fill="var(--accent-2)"/>
    <text x="305" y="78" text-anchor="middle" fill="var(--fg)">+2.5</text>
  </g>
  <g font-family="var(--font-mono)" font-size="12" fill="var(--fg-muted)">
    <path d="M60 160 L480 160" stroke="var(--border)" stroke-width="2" fill="none"/>
    <text x="60" y="178" text-anchor="middle">-1</text>
    <text x="130" y="178" text-anchor="middle">0</text>
    <text x="200" y="178" text-anchor="middle">1</text>
    <text x="270" y="178" text-anchor="middle">2</text>
    <text x="340" y="178" text-anchor="middle">3</text>
    <text x="410" y="178" text-anchor="middle">4</text>
    <text x="480" y="178" text-anchor="middle">5 points</text>
  </g>
</svg>
```

```narrate
The picture shows the lift in percentage points. [[zero]] The dashed line at zero means no difference. [[estimate]] The dot is our best guess: the variant is two and a half points higher. [[interval]] The bar is the ninety five percent interval, from about half a point to four and a half points. It stays clear of zero, which agrees with a p value of about one point two percent.
```

## How many people? Decide first

Before launch, fix four inputs: the baseline rate, the **smallest lift worth detecting** (in points, not percent of percent), significance (5%, the false alarm rate you accept) and power (80%). **Power** is the chance to detect that lift if it is real.

```text
n = ((z_alpha * sqrt(2 * pbar * (1 - pbar))
      + z_power * sqrt(p1 * (1 - p1) + p2 * (1 - p2))) / (p2 - p1)) ** 2
```

Here `p1` is the baseline, `p2 = p1 + lift`, `pbar` is their average. `n` is **per variant**. `z_alpha` is the normal value that leaves 2.5% in each tail (1.96); `z_power` leaves 20% in the upper tail (0.84).

```svg Baseline 10%: halving the lift you want to detect roughly quadruples the people you need per variant
<svg viewBox="0 0 520 190" role="img" aria-label="Sample size per variant for three lifts">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="two">
      <text x="20" y="52" fill="var(--fg)">+2 pts</text>
      <rect x="100" y="34" width="22" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="132" y="52" fill="var(--fg)">3,841</text>
    </g>
    <g data-cue="one">
      <text x="20" y="102" fill="var(--fg)">+1 pt</text>
      <rect x="100" y="84" width="84" height="26" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="194" y="102" fill="var(--fg)">14,751</text>
    </g>
    <g data-cue="half">
      <text x="20" y="152" fill="var(--fg)">+0.5 pt</text>
      <rect x="100" y="134" width="330" height="26" fill="var(--primary-container)" stroke="var(--danger)" stroke-width="2"/>
      <text x="440" y="152" fill="var(--fg)">57,763</text>
    </g>
  </g>
</svg>
```

```narrate
Baseline conversion is ten percent. [[two]] To detect a lift of two points you need about thirty eight hundred people in each group. [[one]] Halve the lift to one point, and you need about fifteen thousand, roughly four times more. [[half]] Halve it again and you need nearly fifty eight thousand. Small effects are expensive, because the effect is squared in the formula.
```

```quiz
q: You want to detect a lift half as big. Roughly how many people per variant do you need compared with before?
options:
  - the same
  - twice as many
  - four times as many
answer: 2
why: The lift sits squared in the bottom of the formula, so halving it multiplies n by 4.
```

## Peeking breaks the p-value

The p-value is only valid if you fixed the sample size **before** the test and look **once**. Check daily and stop at the first p below 0.05, and luck gets many chances.

Simulation, 20,000 A/A tests per bar (both groups identical, so every "win" is false), 5% significance, looks evenly spaced:

```svg Same test, more looks: false winners grow from 5% to about 25%
<svg viewBox="0 0 520 230" role="img" aria-label="False positive rate by number of looks">
  <g data-cue="promise" font-family="var(--font-mono)" font-size="12">
    <path d="M100 160 L450 160" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
    <text x="14" y="164" fill="var(--danger)">promised 5%</text>
  </g>
  <g data-cue="bars" font-family="var(--font-mono)" font-size="12">
    <path d="M100 190 L450 190" stroke="var(--border)" stroke-width="2" fill="none"/>
    <rect x="120" y="160" width="44" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="142" y="154" text-anchor="middle" fill="var(--fg)">5%</text>
    <text x="142" y="208" text-anchor="middle" fill="var(--fg-muted)">1 look</text>
    <rect x="188" y="142" width="44" height="48" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="210" y="136" text-anchor="middle" fill="var(--fg)">8%</text>
    <text x="210" y="208" text-anchor="middle" fill="var(--fg-muted)">2</text>
    <rect x="256" y="106" width="44" height="84" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="278" y="100" text-anchor="middle" fill="var(--fg)">14%</text>
    <text x="278" y="208" text-anchor="middle" fill="var(--fg-muted)">5</text>
    <rect x="324" y="76" width="44" height="114" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="346" y="70" text-anchor="middle" fill="var(--fg)">19%</text>
    <text x="346" y="208" text-anchor="middle" fill="var(--fg-muted)">10</text>
  </g>
  <g data-cue="worst" font-family="var(--font-mono)" font-size="12">
    <rect x="392" y="40" width="44" height="150" fill="var(--danger)" stroke="var(--border)" stroke-width="2"/>
    <text x="414" y="34" text-anchor="middle" fill="var(--fg)">25%</text>
    <text x="414" y="208" text-anchor="middle" fill="var(--fg-muted)">20 looks</text>
  </g>
</svg>
```

```narrate
Both groups in this simulation are identical, so every win is a false alarm. [[promise]] The test promises five percent false alarms. [[bars]] With one look that is what you get. With two looks it is about eight percent, with five looks fourteen, with ten looks nineteen. [[worst]] Check twenty times and about one test in four crowns a winner that is not real.
```

> **Why:** committing to a sample size in advance removes the problem. Evan Miller: "Committing to a sample size completely mitigates the problem described here."

> **Not this:** "stop as soon as p < 0.05". If you must stop early, use a sequential design built for it.

## Say it in the interview

| Step | What to say |
|---|---|
| Goal | One primary metric, plus guardrails that must not get worse |
| Design | Randomize by user, 50/50, sample size fixed in advance, run whole weeks |
| Result | Lift, interval and p: "+2.5 points, +0.5 to +4.5, p = 0.012" |
| Decision | Is the lift big enough to matter, not only significant? |

> **Trap:** "not significant" does not mean "no effect". The test may have been too small to see it. Say which.

```narrate
Walk through four steps. State one main metric and the guardrail metrics that must not get worse. Describe the design: randomize by user, split evenly, fix the sample size, and run whole weeks to cover every day of the week. Report the lift, the interval and the p value together. Then decide if the lift is big enough to matter. And remember, not significant does not mean no effect. The test may simply have been too small.
```

## Your turn

Open `ab_test.py`. Implement two functions with keyword arguments. No scipy: use `statistics.NormalDist` for the normal curve.

- `ab_test(control_visitors, control_conversions, variant_visitors, variant_conversions, confidence=0.95)` returns an `AbTestResult` with `z`, `p_value`, `ci_low`, `ci_high`. The lift is variant minus control. The p-value is two-sided
- `sample_size_per_variant(baseline_rate, minimum_detectable_effect, alpha=0.05, power=0.8)` returns the whole number of people per variant, rounded **up**

The tests compare your numbers with scipy.

```hint
NormalDist().cdf gives the area to the left of a value. The two-sided p-value is 2 * NormalDist().cdf(-abs(z)). The 1.96 comes from NormalDist().inv_cdf(1 - (1 - confidence) / 2).
```

```hint
Use two different standard errors: the pooled one inside z, and the unpooled one (each group's own rate) for the interval.
```

```hint
For sample size, p2 = baseline_rate + minimum_detectable_effect. Get z_alpha from inv_cdf(1 - alpha / 2) and z_power from inv_cdf(power). Wrap the final value in math.ceil.
```
