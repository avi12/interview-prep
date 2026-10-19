---
title: Center and spread
lang: py
minutes: 25
level: junior
roles: [analyst]
files: [summary_stats.py]
sources:
  - https://docs.python.org/3/library/statistics.html
  - https://numpy.org/doc/stable/reference/generated/numpy.percentile.html
  - https://numpy.org/doc/stable/reference/generated/numpy.std.html
  - https://pandas.pydata.org/docs/reference/api/pandas.Series.quantile.html
  - https://pandas.pydata.org/docs/reference/api/pandas.Series.std.html
  - https://openstax.org/books/introductory-statistics/pages/2-6-skewness-and-the-mean-median-and-mode
  - https://en.wikipedia.org/wiki/Interquartile_range
---

## The mean can lie

Five salaries, in thousands: `40, 42, 45, 48, 400`.

- **Mean**: add up, divide by the count. Here 115
- **Median**: sort, take the middle one (for an even count, average the two middle ones). Here 45
- **Mode**: the most frequent value. There can be several

The mean is higher than four of the five people. One extreme value dragged it. On right-skewed data like pay, the mean is usually above the median.

> **Why:** say "median" when the data has a long tail (pay, prices, delivery times). Say "mean" when you need the total back, like revenue per user times users.

```svg The mean (115) is higher than four of five salaries, the median (45) sits among them
<svg viewBox="0 0 520 250" role="img" aria-label="Five salary bars with the mean and median lines">
  <g data-cue="bars" font-family="var(--font-mono)" font-size="12">
    <path d="M130 220 L440 220" stroke="var(--border)" stroke-width="2" fill="none"/>
    <rect x="140" y="200" width="42" height="20" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="161" y="238" text-anchor="middle" fill="var(--fg)">40</text>
    <rect x="202" y="199" width="42" height="21" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="223" y="238" text-anchor="middle" fill="var(--fg)">42</text>
    <rect x="264" y="197" width="42" height="23" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="285" y="238" text-anchor="middle" fill="var(--fg)">45</text>
    <rect x="326" y="196" width="42" height="24" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="347" y="238" text-anchor="middle" fill="var(--fg)">48</text>
    <rect x="388" y="20" width="42" height="200" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="409" y="238" text-anchor="middle" fill="var(--fg)">400</text>
  </g>
  <g data-cue="median" font-family="var(--font-mono)" font-size="14">
    <path d="M130 197 L440 197" stroke="var(--ok)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
    <text x="20" y="202" fill="var(--ok)">median 45</text>
  </g>
  <g data-cue="mean" font-family="var(--font-mono)" font-size="14">
    <path d="M130 162 L440 162" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
    <text x="20" y="167" fill="var(--danger)">mean 115</text>
  </g>
</svg>
```

```narrate
Five salaries, in thousands. [[bars]] Four people earn around forty to forty eight, and one earns four hundred. [[median]] Sort them and take the middle one. The median is forty five, a number that describes a real, typical person. [[mean]] Add them up and divide by five, and the mean is one hundred fifteen, higher than four of the five people. One extreme value dragged it up.
```

## Spread: how far from typical?

| Measure | What it is | Moved by one outlier? |
|---|---|---|
| Range | max minus min | a lot |
| Standard deviation | typical distance from the mean | yes, distances are squared |
| IQR | width of the middle half, Q3 minus Q1 | no |

**Sample or population?** Divide the squared distances by `n - 1` when your data is a sample (almost always). Divide by `n` only if you hold the whole population.

> **Trap:** the defaults disagree. `pandas` `.std()` divides by `n - 1`. `numpy.std` divides by `n` unless you pass `ddof=1`. Same data, two answers.

```narrate
Spread tells you how far to trust the typical value. The range is just biggest minus smallest, so one outlier ruins it. Standard deviation is the typical distance from the mean, and it is pulled by outliers too, because the distances are squared. The interquartile range, I Q R, is the width of the middle half of the data. Extremes cannot move it. Watch the divisor: sample data divides by n minus one.
```

```quiz
q: One salary in a list jumps from 400 to 4,000. Which spread measure barely changes?
options:
  - range
  - standard deviation
  - IQR
answer: 2
why: The IQR only looks at the 25th and 75th percentiles, so a change at the extreme end does not move it. Range and standard deviation both react.
```

## Percentiles by interpolation

The p-th percentile is the value that p% of the data sits at or below. Recipe:

1. Sort the values
2. Position = `p / 100 * (n - 1)`, counting from 0
3. If the position falls between two values, blend them

```svg 25th percentile of [1, 2, 3, 4]: position 0.75, three quarters of the way from 1 to 2
<svg viewBox="0 0 520 210" role="img" aria-label="Interpolating the 25th percentile between two sorted values">
  <g data-cue="sorted" font-family="var(--font-mono)" font-size="16">
    <rect x="60" y="30" width="60" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="90" y="56" text-anchor="middle" fill="var(--fg)">1</text>
    <rect x="140" y="30" width="60" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="170" y="56" text-anchor="middle" fill="var(--fg)">2</text>
    <rect x="220" y="30" width="60" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="250" y="56" text-anchor="middle" fill="var(--fg)">3</text>
    <rect x="300" y="30" width="60" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="330" y="56" text-anchor="middle" fill="var(--fg)">4</text>
    <g font-size="12" fill="var(--fg-muted)">
      <text x="90" y="88" text-anchor="middle">index 0</text>
      <text x="170" y="88" text-anchor="middle">index 1</text>
      <text x="250" y="88" text-anchor="middle">index 2</text>
      <text x="330" y="88" text-anchor="middle">index 3</text>
    </g>
  </g>
  <g data-cue="position" font-family="var(--font-mono)" font-size="14">
    <path d="M90 108 L170 108" stroke="var(--border)" stroke-width="2" fill="none"/>
    <circle cx="150" cy="108" r="6" fill="var(--accent-2)"/>
    <text x="60" y="136" fill="var(--fg)">position = 0.25 x (4 - 1) = 0.75</text>
  </g>
  <g data-cue="blend" font-family="var(--font-mono)" font-size="14">
    <text x="60" y="170" fill="var(--fg)">value = 1 + 0.75 x (2 - 1) = 1.75</text>
    <text x="60" y="194" fill="var(--fg-muted)">numpy and pandas use this rule</text>
  </g>
</svg>
```

```narrate
Sort the values first. [[sorted]] Here are four numbers, with positions counted from zero. [[position]] For the twenty fifth percentile, go twenty five percent of the way along the gaps. Four numbers have three gaps, so the position is zero point seven five. [[blend]] That is three quarters of the way from the first number to the second, which gives one point seven five. Tools differ on this rule, so always say which one you used.
```

> **Trap:** Python's `statistics.quantiles` defaults to a different rule (`exclusive`) and returns 1.25 for the same data. Neither is wrong. Name your method.

## Flag outliers with the IQR rule

Fences sit 1.5 box-widths outside the box:

- Lower fence = `Q1 - 1.5 * IQR`
- Upper fence = `Q3 + 1.5 * IQR`
- Outlier = strictly beyond a fence

```svg Delivery days: the box is the middle half, the fence is at 10, so the 18-day delivery is flagged
<svg viewBox="0 0 520 220" role="img" aria-label="Box plot with fences and one outlier">
  <g data-cue="box" font-family="var(--font-mono)" font-size="13">
    <path d="M74 100 L112 100" stroke="var(--fg)" stroke-width="2" fill="none"/>
    <path d="M168 100 L184 100" stroke="var(--fg)" stroke-width="2" fill="none"/>
    <rect x="112" y="80" width="56" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <path d="M140 80 L140 120" stroke="var(--fg)" stroke-width="3" fill="none"/>
    <text x="140" y="72" text-anchor="middle" fill="var(--fg-muted)">middle half</text>
  </g>
  <g data-cue="fence" font-family="var(--font-mono)" font-size="13">
    <path d="M250 60 L250 140" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
    <text x="250" y="52" text-anchor="middle" fill="var(--fg)">upper fence 10</text>
    <path d="M30 60 L30 140" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
    <text x="30" y="52" fill="var(--fg)">lower fence 0</text>
  </g>
  <g data-cue="outlier" font-family="var(--font-mono)" font-size="13">
    <circle cx="426" cy="100" r="7" fill="var(--danger)"/>
    <text x="426" y="84" text-anchor="middle" fill="var(--danger)">18 days</text>
  </g>
  <g font-family="var(--font-mono)" font-size="12" fill="var(--fg-muted)">
    <path d="M30 150 L470 150" stroke="var(--border)" stroke-width="2" fill="none"/>
    <text x="30" y="168" text-anchor="middle">0</text>
    <text x="140" y="168" text-anchor="middle">5</text>
    <text x="250" y="168" text-anchor="middle">10</text>
    <text x="360" y="168" text-anchor="middle">15</text>
    <text x="470" y="168" text-anchor="middle">20</text>
    <text x="30" y="200">IQR = 6.25 - 3.75 = 2.5, upper fence = 6.25 + 1.5 x 2.5 = 10</text>
  </g>
</svg>
```

```narrate
Here is a box plot of delivery days. [[box]] The box spans the middle half of the data, and the thick line inside is the median. [[fence]] The fences sit one and a half box widths beyond each edge. Here the upper fence is at ten days. [[outlier]] Anything past a fence is flagged. The eighteen day delivery is far beyond ten, so it is an outlier.
```

> **Why:** quartiles ignore the extremes, so an outlier cannot hide itself by stretching the yardstick.

> **Not this:** "flag anything beyond 3 standard deviations". The 18 inflates the mean and the standard deviation, so it sits only 2.9 deviations out and escapes. With 12 values, nothing can ever be further than 3.2.

> **Trap:** flagged does not mean wrong. Look at it first: typo, test order, or a real big customer?

```quiz
q: Q1 is 10 and Q3 is 20. Is a value of 36 an outlier under the 1.5 x IQR rule?
options:
  - no, the upper fence is 40
  - yes, the upper fence is 35
  - no, outliers need 3 x IQR
answer: 1
why: IQR is 10, so the upper fence is 20 + 1.5 x 10 = 35. A value of 36 is past it.
```

## Your turn

Open `summary_stats.py`. Implement these **without** `statistics`, `numpy` or `pandas`:

- `mean(values)` and `median(values)`
- `modes(values)`: every value tied for most frequent, sorted
- `percentile(values, percent)`: percent from 0 to 100, linear interpolation as above
- `sample_std(values)`: divide by `n - 1`
- `iqr_outliers(values)`: the flagged values, in their original order

Empty input raises `ValueError`. So does `sample_std` with fewer than 2 values, and a percent outside 0 to 100.

```hint
median is just the 50th percentile, so build percentile first and reuse it.
```

```hint
For percentile: sort a copy, compute position = percent / 100 * (len - 1), take the value at int(position), and add the fraction of the gap to the next value. At the last index there is no next value.
```

```hint
iqr_outliers needs percentile at 25 and 75, then a list comprehension that keeps values strictly below the lower fence or strictly above the upper fence.
```
