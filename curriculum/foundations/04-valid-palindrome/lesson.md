---
title: Valid Palindrome
lang: py
minutes: 15
level: junior
roles: [backend, analyst, ai]
files: [valid_palindrome.py]
sources:
  - https://www.algo.monster/liteproblems/125
  - https://docs.python.org/3/library/stdtypes.html#str.isalnum
  - https://docs.python.org/3/library/tracemalloc.html
---

## The problem

A text is a palindrome if, after you lowercase it and drop everything except **letters and digits**, it reads the same forwards and backwards.

- `"A man, a plan, a canal: Panama"` is one
- `"race a car"` is not
- `" "` is one: nothing is left, and nothing reads differently

Return `True` or `False`.

```narrate
Given a sentence, decide whether it reads the same in both directions, ignoring case, spaces and punctuation. Only letters and digits count. A text with no letters or digits at all counts as a palindrome.
```

## The easy way, and its price

Clean the text, then compare it with its reverse.

```python
cleaned = "".join(char.lower() for char in text if char.isalnum())
return cleaned == cleaned[::-1]
```

It is correct and short. But it builds a cleaned copy **and** a reversed copy. For `n` characters that is **O(n) extra space**.

> **Not this:** reverse and compare. Time is fine at `O(n)`, but it holds two extra strings. The interviewer's next question is "can you do it without the copies?"

```narrate
The quick answer is to clean the text and compare it with its reverse. It works, and it is short. The cost is memory: you build a cleaned copy and then a reversed copy, so the extra space grows with the length of the text. The follow-up question is always, can you do it without the copies?
```

## Two pointers, comparing in place

You do not need a copy to compare the two ends. Put one pointer at each end and walk inward:

- Skip a character that is not a letter or digit
- Compare the two lowercase characters
- A mismatch means `False`. Pointers that meet or cross mean `True`

```svg Checking "Ab,_ba": compare the ends, move in, then skip the punctuation until the pointers cross
<svg viewBox="0 0 520 230" role="img" aria-label="Two pointers moving inward over a short text">
  <g font-family="var(--font-mono)" font-size="16" text-anchor="middle">
    <g data-cue="ends">
      <text x="8" y="43" text-anchor="start" font-size="12" fill="var(--fg-muted)">1  ends match</text>
      <rect x="150" y="20" width="44" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="172" y="42" fill="var(--fg)">A</text>
      <rect x="200" y="20" width="44" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="222" y="42" fill="var(--fg)">b</text>
      <rect x="250" y="20" width="44" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="272" y="42" fill="var(--fg)">,</text>
      <rect x="300" y="20" width="44" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="322" y="42" fill="var(--fg)">_</text>
      <rect x="350" y="20" width="44" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="372" y="42" fill="var(--fg)">b</text>
      <rect x="400" y="20" width="44" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="422" y="42" fill="var(--fg)">a</text>
      <text x="172" y="72" font-size="13" fill="var(--accent-2)">L</text>
      <text x="422" y="72" font-size="13" fill="var(--accent-2)">R</text>
    </g>
    <g data-cue="inward">
      <text x="8" y="113" text-anchor="start" font-size="12" fill="var(--fg-muted)">2  move in</text>
      <rect x="150" y="90" width="44" height="32" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="172" y="112" fill="var(--fg-muted)">A</text>
      <rect x="200" y="90" width="44" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="222" y="112" fill="var(--fg)">b</text>
      <rect x="250" y="90" width="44" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="272" y="112" fill="var(--fg)">,</text>
      <rect x="300" y="90" width="44" height="32" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="322" y="112" fill="var(--fg)">_</text>
      <rect x="350" y="90" width="44" height="32" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="372" y="112" fill="var(--fg)">b</text>
      <rect x="400" y="90" width="44" height="32" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="422" y="112" fill="var(--fg-muted)">a</text>
      <text x="222" y="142" font-size="13" fill="var(--accent-2)">L</text>
      <text x="372" y="142" font-size="13" fill="var(--accent-2)">R</text>
    </g>
    <g data-cue="cross">
      <text x="8" y="183" text-anchor="start" font-size="12" fill="var(--fg-muted)">3  skip, cross</text>
      <rect x="150" y="160" width="44" height="32" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="172" y="182" fill="var(--fg-muted)">A</text>
      <rect x="200" y="160" width="44" height="32" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="222" y="182" fill="var(--fg-muted)">b</text>
      <rect x="250" y="160" width="44" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="272" y="182" fill="var(--fg)">,</text>
      <rect x="300" y="160" width="44" height="32" fill="var(--surface-2)" stroke="var(--danger)" stroke-width="2"/>
      <text x="322" y="182" fill="var(--fg)">_</text>
      <rect x="350" y="160" width="44" height="32" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="372" y="182" fill="var(--fg-muted)">b</text>
      <rect x="400" y="160" width="44" height="32" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="422" y="182" fill="var(--fg-muted)">a</text>
      <text x="272" y="212" font-size="13" fill="var(--accent-2)">L</text>
      <text x="322" y="212" font-size="13" fill="var(--accent-2)">R</text>
    </g>
  </g>
</svg>
```

```narrate
Put one pointer at each end. [[ends]] First we compare the two ends, a and a. They match, so both pointers step inward. [[inward]] Next, b and b. Match again, and both step in. [[cross]] Now the pointers sit on punctuation. We skip both, they cross, nothing ever mismatched, so the answer is true.
```

> **Why:** you only ever **read** the text, so there is nothing to allocate. `O(n)` time, `O(1)` extra space.

## Details that fail people

- Skip with a loop that **rechecks** `left < right`, or the pointers can cross while skipping
- `isalnum()` is true for letters and digits. An underscore is not alphanumeric
- Compare `.lower()` of both characters, not the raw ones

> **Trap:** do not drop digits. `"0P"` is **not** a palindrome. Cleaned and lowercased it is `"0p"`, which reversed is `"p0"`.

```narrate
Three details. Keep checking that the left pointer is still left of the right one while you skip, or they can cross by accident. Compare lowercase versions of both characters. And do not throw away digits: zero followed by p is not a palindrome.
```

```quiz
q: What does is_palindrome("0P") return?
options:
  - True
  - False
answer: 1
why: The cleaned text is "0p". Reversed it is "p0", which is different. Digits count as characters.
```

## Your turn

Implement `is_palindrome(text)` in `valid_palindrome.py`.

- Two indexes, `left` and `right`, no cleaned string and no `[::-1]`
- An early return on the first mismatch

The last test measures extra memory on a text of 1.8 million characters. Any copy of the text fails it.

```hint
Start with `left = 0` and `right = len(text) - 1`, and loop `while left < right`.
```

```hint
Inside the loop: if `text[left]` is not alphanumeric, move `left` forward and `continue`. Do the same for `right`, moving it back.
```

```hint
When both characters are alphanumeric, compare their `.lower()` versions. If they differ, `return False`. Otherwise move both pointers and keep going. After the loop, `return True`.
```
