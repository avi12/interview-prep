---
title: Longest Substring Without Repeating Characters
lang: ts
minutes: 20
level: junior
roles: [backend, analyst, ai]
files: [lengthOfLongestSubstring.ts]
sources:
  - https://neetcode.io/solutions/longest-substring-without-repeating-characters
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
  - https://www.bigocheatsheet.com/
---

## The problem

Given a string `text`, return the length of the longest **substring** that has no repeated character. A substring is a run of neighbors, not a pick of letters.

- `"abcabcbb"` returns `3`, from `"abc"`
- `"bbbbb"` returns `1`
- `"pwwkew"` returns `3`, from `"wke"`. Not `"pwke"`: that skips a letter

```narrate
Given a string, find the longest stretch of neighboring characters in which no character appears twice, and return its length. It has to be a continuous piece of the string. Picking letters from here and there does not count.
```

## Brute force, and its price

For every start position, walk forward until a character repeats. Keep the best length.

```ts
for (let start = 0; start < text.length; start++) {
  const seen = new Set<string>();
  let end = start;
  while (end < text.length && !seen.has(text[end])) seen.add(text[end++]);
  best = Math.max(best, end - start);
}
```

Every start **rescans** characters the last start already checked. Roughly `n` times the window size: it can reach **O(n²)**.

> **Why:** the hint is in the waste. When a repeat shows up, you already know a lot about the text behind you. Throwing that away and starting over is the cost.

```narrate
The first idea is to try every starting position and walk forward until a character repeats. It works, but each new start rescans letters that the previous start already looked at. On long text with long windows, that is quadratic. The cure is to stop throwing away what we learned.
```

## A window that slides

Keep a **window** `[windowStart, index]` that never contains a repeat. Move `index` right, one character at a time. A `Map` remembers the **last index** of every character.

When `text[index]` was seen before, jump `windowStart` to just **past** the old copy. No stepping, no restart.

```svg "abcabcbb": at the second a, the window start jumps from 0 to 1
<svg viewBox="0 0 520 236" role="img" aria-label="String with a window, a last-seen map and a jump">
  <g font-family="var(--font-mono)" font-size="16" text-anchor="middle">
    <g data-cue="map">
      <rect x="16" y="52" width="176" height="46" fill="none" stroke="var(--primary)" stroke-width="3"/>
      <rect x="20" y="146" width="250" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="167" text-anchor="start" font-size="14" fill="var(--fg)">last seen: a:0  b:1  c:2</text>
    </g>
    <g>
      <text x="45" y="46" font-size="12" fill="var(--fg-muted)">0</text>
      <text x="103" y="46" font-size="12" fill="var(--fg-muted)">1</text>
      <text x="161" y="46" font-size="12" fill="var(--fg-muted)">2</text>
      <text x="219" y="46" font-size="12" fill="var(--fg-muted)">3</text>
      <text x="277" y="46" font-size="12" fill="var(--fg-muted)">4</text>
      <text x="335" y="46" font-size="12" fill="var(--fg-muted)">5</text>
      <text x="393" y="46" font-size="12" fill="var(--fg-muted)">6</text>
      <text x="451" y="46" font-size="12" fill="var(--fg-muted)">7</text>
      <rect x="20" y="56" width="50" height="38" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="45" y="82" fill="var(--fg)">a</text>
      <rect x="78" y="56" width="50" height="38" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="103" y="82" fill="var(--fg)">b</text>
      <rect x="136" y="56" width="50" height="38" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="161" y="82" fill="var(--fg)">c</text>
    </g>
    <g data-cue="repeat">
      <rect x="194" y="56" width="50" height="38" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="3"/>
      <text x="219" y="82" fill="var(--fg)">a</text>
      <text x="219" y="116" font-size="12" fill="var(--danger)">seen!</text>
    </g>
    <g>
      <rect x="252" y="56" width="50" height="38" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="277" y="82" fill="var(--fg)">b</text>
      <rect x="310" y="56" width="50" height="38" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="335" y="82" fill="var(--fg)">c</text>
      <rect x="368" y="56" width="50" height="38" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="393" y="82" fill="var(--fg)">b</text>
      <rect x="426" y="56" width="50" height="38" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="451" y="82" fill="var(--fg)">b</text>
    </g>
    <g data-cue="jump">
      <path d="M45 100 C45 124 103 124 103 106" fill="none" stroke="var(--accent-2)" stroke-width="3"/>
      <path d="M103 106 L97 116 M103 106 L110 116" stroke="var(--accent-2)" stroke-width="3"/>
      <text x="30" y="204" text-anchor="start" font-size="14" fill="var(--fg)">start = old a at 0, plus 1 = 1</text>
    </g>
    <g data-cue="window">
      <rect x="74" y="52" width="174" height="46" fill="none" stroke="var(--ok)" stroke-width="3" stroke-dasharray="7 4"/>
      <text x="30" y="226" text-anchor="start" font-size="14" fill="var(--fg)">new window: b c a, length 3</text>
    </g>
  </g>
</svg>
```

```narrate
Take a b c a b c b b. [[map]] A map remembers the last index of every character. After a, b and c it holds a at zero, b at one, c at two, and the window is those first three letters. [[repeat]] Now the right edge reaches a second a. [[jump]] The map says the old a sat at index zero, so the start of the window jumps straight to one, just past it. [[window]] The window is now b, c, a. Still three letters, still no repeats.
```

> **Why:** the window start only ever moves **forward**, and the right edge moves forward once per character. Each character is handled once: `O(n)` time, and `O(m)` space for `m` distinct characters.

## Two ways to get it wrong

When the window start moves, take the **larger** of its current value and `lastIndex + 1`. The old copy might sit **outside** the window.

| right | char | last seen | start | window |
|---|---|---|---|---|
| 0 | a | none | 0 | a |
| 1 | b | none | 0 | ab |
| 2 | b | 1 | 2 | b |
| 3 | a | 0 | stays 2, not 1 | ba |

> **Trap:** at the last `a` of `"abba"`, the map says `0`. Using `0 + 1` would move the start **backward** and bring the repeated `b` back into the window.

> **Not this:** restart the window at the repeat. For `"dvdf"` that gives `"df"` and loses `"vdf"`, which is longer.

```narrate
The first mistake is a start that moves backward. In a b b a, when the last a arrives, the map still says zero, but the window already begins at two. So take the larger of the two values. The second mistake is restarting at the repeat itself. In d v d f, that loses the better window, v d f.
```

```quiz
q: In "abba", the window starts at 2 and the map says a was last at 0. Where does the start go for the last a?
options:
  - 1
  - 2
  - 0
answer: 1
why: The larger of 2 and 0 + 1 is 2. Moving to 1 would bring the repeated b back into the window.
```

## Your turn

Open `lengthOfLongestSubstring.ts` in your copy and make the tests pass. The file exports `lengthOfLongestSubstring(text)`.

- One loop, one `Map` from character to last index
- Return `0` for an empty string

The last test uses a 20,000 character text with a 4,000 character window, and gives you 150 milliseconds. Rescanning from every start is too slow.

```hint
Create `lastIndexByChar` as a `Map<string, number>`, plus `windowStart = 0` and `longest = 0`.
```

```hint
Loop with `for (const [index, char] of [...text].entries())`. Ask the map for the last index of `char`. If there is one, set `windowStart = Math.max(windowStart, lastIndex + 1)`.
```

```hint
After the check, store `index` in the map for `char`, then update `longest` with `index - windowStart + 1`. Both ends of the window are included, so add one.
```
