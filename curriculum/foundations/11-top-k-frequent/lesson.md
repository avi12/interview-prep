---
title: Top K Frequent Elements
lang: py
minutes: 20
level: junior
roles: [backend, analyst, ai]
files: [top_k_frequent.py]
sources:
  - https://docs.python.org/3/library/heapq.html
  - https://docs.python.org/3/library/collections.html#collections.Counter
  - https://neetcode.io/solutions/top-k-frequent-elements
  - https://www.designgurus.io/answers/detail/347-top-k-frequent-elements-nagj4790
---

## The problem

Given a list `nums` and a number `k`, return the `k` values that appear **most often**. Any order is fine, and the answer is always unique.

- `top_k_frequent([1, 1, 1, 2, 2, 3], 2)` returns `[1, 2]`
- `1` appears 3 times, `2` twice, `3` once
- `top_k_frequent([7], 1)` returns `[7]`

```narrate
Given a list of numbers and a number k, return the k values that show up most often. This is the classic top k question. It comes in many costumes: top searches, busiest users, most common errors. So the pattern is worth knowing well.
```

## Count first, and why not sort everything

Step one never changes: **count**. `Counter(nums)` does it in one pass, `O(n)`.

Counting by calling `nums.count(value)` for every distinct value is the slow trap. Each call scans the whole list. With 60,000 distinct values in 66,000 numbers, that is about 4 billion steps.

Next idea: sort all the pairs by count and take `k`. That is correct, and a fine first answer. But it orders every distinct value to answer a question about only `k` of them: `O(d log d)`, where `d` is the number of distinct values.

> **Why:** the follow-up is always "can you beat `O(n log n)`?". You do not need a full order, only the top `k`.

> **Not this:** `nums.count(value)` inside a loop. Count with a hash map, once.

```narrate
Always count first, with a hash map, in one pass. Counting with the list count method inside a loop rescans the whole list for every value, and that is billions of steps. Then comes the tempting step: sort everything and slice. It works, but it orders every distinct value to answer a question about only k of them. Say that out loud, then improve it.
```

## Keep only k: the min-heap

A **heap** keeps its smallest item on top and finds it in one step. Python's `heapq` is a **min-heap**.

Keep a heap of at most `k` pairs `(count, value)`. The top is the **weakest** of the best `k` so far. A new value joins, and if the heap grows past `k`, the top leaves. Each push or pop costs `O(log k)`, so the whole thing is `O(d log k)`.

```svg With k = 2, the third value makes the heap too big, so the weakest one on top is removed
<svg viewBox="0 0 520 230" role="img" aria-label="A min-heap of size two evicts the weakest value">
  <g font-family="var(--font-mono)" font-size="14">
    <g data-cue="counts">
      <text x="20" y="24" fill="var(--fg-muted)" font-size="13">counts, one by one</text>
      <rect x="20" y="40" width="110" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="75" y="62" text-anchor="middle" fill="var(--fg)">3 seen 1x</text>
      <rect x="20" y="84" width="110" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="75" y="106" text-anchor="middle" fill="var(--fg)">2 seen 2x</text>
      <rect x="20" y="128" width="110" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="75" y="150" text-anchor="middle" fill="var(--fg)">1 seen 3x</text>
      <path d="M130 145 L190 145 L190 112" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
    </g>
    <g data-cue="heap">
      <text x="200" y="24" fill="var(--fg-muted)" font-size="13">min-heap, room for k = 2</text>
      <path d="M270 94 L230 134 M270 94 L310 134" stroke="var(--border)" stroke-width="2" fill="none"/>
      <rect x="225" y="60" width="90" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="270" y="82" text-anchor="middle" fill="var(--fg)">3 x1</text>
      <rect x="185" y="134" width="90" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="230" y="156" text-anchor="middle" fill="var(--fg)">2 x2</text>
      <rect x="285" y="134" width="90" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="330" y="156" text-anchor="middle" fill="var(--fg)">1 x3</text>
      <text x="270" y="204" text-anchor="middle" fill="var(--fg-muted)" font-size="13">top = smallest count</text>
    </g>
    <g data-cue="pop">
      <path d="M318 77 L390 77" stroke="var(--danger)" stroke-width="2"/>
      <rect x="390" y="60" width="110" height="34" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="445" y="82" text-anchor="middle" fill="var(--danger)">pop 3 x1</text>
      <text x="390" y="120" fill="var(--ok)" font-size="13">kept: 2 and 1</text>
    </g>
  </g>
</svg>
```

```narrate
Follow the picture. [[counts]] The counts arrive one value at a time. [[heap]] Each one is pushed into a heap that has room for two. The smallest count always sits on top, so the top is the weakest candidate. After the third push, the heap holds three. [[pop]] We pop the top, value three with a count of one, and what remains is the answer.
```

> **Why:** the heap stays small. Memory beyond the counts is `O(k)`, and it also works when values arrive as a stream.

## Or skip comparisons: buckets

A count is a whole number from `1` to `n`. So use the count as an **index**: `buckets[c]` holds the values that appear `c` times. Allocate `n + 1` buckets. Read from the highest bucket down until you have `k` values. No comparisons at all: `O(n)`.

| Approach | Time | Pick it when |
|---|---|---|
| Sort all pairs | `O(d log d)` | first answer, small input |
| Heap of size `k` | `O(d log k)` | `k` is small, or data streams in |
| Bucket sort | `O(n)` | counts are small whole numbers |

> **Trap:** a **max**-heap of everything. For the top `k`, keep a **min**-heap of size `k`. The weakest must be on top, because it is the one you evict.

```quiz
q: Your heap holds the best k pairs so far. Which one sits on top?
options:
  - the most frequent value
  - the least frequent of the k kept
  - the newest value
answer: 1
why: A min-heap puts the smallest count on top. That is the weakest of the kept values, and the first to be evicted when a better one arrives.
```

```narrate
There is also a way with no comparisons. A count is a whole number from one up to n, so use the count as an index into a list of buckets. Fill the buckets, then read from the highest one down until you have k values. That is linear time. In an interview, start with sort, improve to the heap, and mention buckets. And remember the trap: keep a min-heap of size k, never a max-heap of everything.
```

## Your turn

Implement `top_k_frequent(nums, k)` in `top_k_frequent.py`.

- Count with `Counter`
- Keep a `heapq` min-heap of at most `k` pairs `(count, value)`
- Return the `k` values in any order. The tests send 66,000 numbers, so counting inside a loop will time out

```hint
`counts = Counter(nums)` gives you value to count in one pass.
```

```hint
`heapq.heappush(heap, (count, value))` puts the pair in. Tuples compare by count first, so the smallest count stays on top.
```

```hint
After each push, if `len(heap) > k`, call `heapq.heappop(heap)`. That removes the weakest.
```

```hint
At the end, the heap holds the answer as pairs. Return only the values.
```
