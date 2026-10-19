---
title: Merge Intervals
lang: ts
minutes: 20
level: junior
roles: [backend, analyst, ai]
files: [mergeIntervals.ts]
sources:
  - https://neetcode.io/solutions/merge-intervals
  - https://www.techinterview.org/post/3233476037/merge-intervals-sort-then-sweep/
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
---

## The problem

`intervals` is a list of `[start, end]` pairs, in **any order**. Merge every group that overlaps and return the result.

- `[[1,3],[2,6],[8,10],[15,18]]` returns `[[1,6],[8,10],[15,18]]`
- `[[1,4],[4,5]]` returns `[[1,5]]`: intervals that only touch count as overlapping

Say the touching rule out loud before you code. It is an assumption, and interviewers like hearing you check it.

```narrate
You get a list of ranges in any order. Wherever ranges overlap, combine them into one bigger range, and return what is left. Ranges that only touch at an end, like one to four and four to five, count as overlapping here. In a real interview, say that assumption out loud before you start.
```

## Brute force, and its price

Compare every pair. If two overlap, merge them, and start again, because the new bigger interval may now overlap others. Repeat until nothing merges.

The input order is random, so two intervals that overlap can sit **far apart** in the list. That forces you to compare everything with everything: **O(n²)** or worse.

> **Why:** if you cannot be clever about where the overlaps are, change the problem. Put the intervals in an order where the overlaps come **next to each other**.

```narrate
The brute force compares every pair, merges any that overlap, and starts again, because a merged range may now overlap others. The input order is random, so overlapping ranges can sit far apart in the list, and that makes the work quadratic or worse. The better move is to change the order first.
```

## Sort first, then sweep

Sort by `start`. Then walk the list once, keeping the **last merged interval** open. For each interval:

- Its start is `<=` the open end: it overlaps. Stretch the open end
- Its start is later: there is a gap. Start a new interval

```svg Four sorted intervals on a number line: the first two overlap, the third starts after a gap
<svg viewBox="0 0 520 240" role="img" aria-label="Intervals on a number line and the merged result">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="sorted">
      <path d="M30 24 L30 30 M150 24 L150 30 M270 24 L270 30 M390 24 L390 30" stroke="var(--fg-muted)" stroke-width="2"/>
      <text x="30" y="16" text-anchor="middle" font-size="12" fill="var(--fg-muted)">0</text>
      <text x="150" y="16" text-anchor="middle" font-size="12" fill="var(--fg-muted)">5</text>
      <text x="270" y="16" text-anchor="middle" font-size="12" fill="var(--fg-muted)">10</text>
      <text x="390" y="16" text-anchor="middle" font-size="12" fill="var(--fg-muted)">15</text>
      <rect x="54" y="40" width="48" height="20" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="110" y="55" fill="var(--fg)">[1,3]</text>
      <rect x="78" y="72" width="96" height="20" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="182" y="87" fill="var(--fg)">[2,6]</text>
      <rect x="222" y="104" width="48" height="20" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="278" y="119" fill="var(--fg)">[8,10]</text>
      <rect x="390" y="136" width="72" height="20" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="382" y="151" text-anchor="end" fill="var(--fg)">[15,18]</text>
    </g>
    <g data-cue="overlap">
      <rect x="50" y="35" width="128" height="62" fill="none" stroke="var(--ok)" stroke-width="3" stroke-dasharray="7 4"/>
      <text x="246" y="70" font-size="12" fill="var(--fg)">2 &lt;= 3: overlap, end = max(3, 6)</text>
    </g>
    <g data-cue="gap">
      <path d="M174 114 L222 114" stroke="var(--danger)" stroke-width="3" stroke-dasharray="5 4"/>
      <text x="340" y="119" font-size="12" fill="var(--fg)">8 &gt; 6: gap, start anew</text>
    </g>
    <g data-cue="result">
      <text x="30" y="182" font-size="12" fill="var(--fg-muted)">merged</text>
      <rect x="54" y="188" width="120" height="20" fill="var(--ok)" stroke="var(--border)" stroke-width="2"/>
      <rect x="222" y="188" width="48" height="20" fill="var(--ok)" stroke="var(--border)" stroke-width="2"/>
      <rect x="390" y="188" width="72" height="20" fill="var(--ok)" stroke="var(--border)" stroke-width="2"/>
    </g>
  </g>
</svg>
```

```narrate
Put the ranges on a number line, sorted by where they begin. [[sorted]] Here are four ranges, in order of their start. [[overlap]] The second starts at two, before the first one ends at three. They overlap, so they merge, and the new end is six, the larger of the two ends. [[gap]] The third starts at eight, after six. There is a gap, so a new range begins. [[result]] Three ranges are left, and we looked at each input once.
```

> **Why:** after sorting by start, an interval that overlaps anything earlier must overlap the **most recent** merged one. One comparison per interval is enough.

> **Not this:** compare every pair. The sort costs `O(n log n)` and the sweep `O(n)`, so the sort dominates and still beats `O(n²)`.

## Three bugs to dodge

> **Trap:** keep the **larger** end. `[[1,5],[2,3]]` must stay `[1,5]`. Setting the end to `3` shrinks it. Use `Math.max`.

> **Trap:** `sort()` with no comparator sorts as **text**, so `[10,12]` lands before `[2,6]`. Pass `(a, b) => a[0] - b[0]`.

> **Trap:** `sort()` changes the array you were given. Copy it first: `[...intervals]`.

```narrate
Three bugs to dodge. When intervals overlap, keep the larger end, because a later range can sit completely inside an earlier one. Give sort a numeric comparison, or it sorts as text and puts ten before two. And sort a copy, so you do not change the array you were handed.
```

```quiz
q: After sorting, you hold the open interval [1,5] and the next one is [2,3]. What should the open interval become?
options:
  - "[1,3]"
  - "[1,5]"
  - "[2,5]"
answer: 1
why: The new interval sits inside the open one, so the end stays at the larger value, 5.
```

## Your turn

Open `mergeIntervals.ts` in your copy and make the tests pass. The file exports `mergeIntervals(intervals)`.

- Sort a copy by `start`, then one pass
- Return `[]` for an empty list

The tests include touching intervals, nested intervals, input that must stay unchanged, and 30,000 shuffled intervals with a 300 millisecond limit.

```hint
Copy and sort in one line: `[...intervals].sort(([startA], [startB]) => startA - startB)`.
```

```hint
Make `merged: number[][] = []`. For each `[start, end]`, look at `merged.at(-1)`. If there is none, or `start > last[1]`, push `[start, end]` and `continue`.
```

```hint
Otherwise the interval overlaps the last one: set `last[1] = Math.max(last[1], end)`. Return `merged` after the loop.
```
