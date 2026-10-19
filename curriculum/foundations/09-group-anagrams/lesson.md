---
title: Group Anagrams
lang: py
minutes: 15
level: junior
roles: [backend, analyst, ai]
files: [group_anagrams.py]
sources:
  - https://docs.python.org/3/library/collections.html#collections.defaultdict
  - https://docs.python.org/3/glossary.html#term-hashable
  - https://docs.python.org/3/tutorial/datastructures.html#dictionaries
  - https://wiki.python.org/moin/TimeComplexity
  - https://neetcode.io/solutions/group-anagrams
---

## The problem

Given a list of `words`, put the **anagrams** together. Two words are anagrams when they use the same letters in a different order.

- `["eat", "tea", "tan", "ate", "nat", "bat"]` returns `[["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]`
- The order of the groups, and of the words inside a group, does not matter
- Words use lowercase letters only
- `[""]` returns `[[""]]`

```narrate
You get a list of words, and you must group the ones that are made of the same letters. Eat, tea and ate go together. Tan and nat go together. This question shows up constantly, because it tests one idea: how to label things so that equal things get the same label.
```

## Brute force, and its price

Walk the words. For each one, compare it with the first word of every group built so far. Found a match, join that group. No match, start a new group.

```python
for word in words:
    for group in groups:
        if sorted(group[0]) == sorted(word):
            group.append(word)
            break
    else:
        groups.append([word])
```

If most words are different, each word is compared with almost every group. For 30,000 words that is hundreds of millions of comparisons.

> **Why:** the slow part is **searching** for the right group. A dictionary can find it in one step.

```narrate
The obvious way compares every word with every group so far. It is correct, but when most words are different, the work grows with the square of the list size. At thirty thousand words that is hundreds of millions of comparisons. The slow part is searching for the group, and a dictionary removes that search.
```

## One key for the whole family

Give every word a **canonical key**: a label that is identical for all anagrams and different for everything else. Sort the letters. `eat`, `tea` and `ate` all become `aet`.

Then use the key in a dict: key to list of words. One pass, no searching.

```svg Every word is turned into a key by sorting its letters, and the key picks the list the word joins
<svg viewBox="0 0 520 250" role="img" aria-label="Words become sorted keys and land in dictionary lists">
  <g font-family="var(--font-mono)" font-size="15">
    <g data-cue="words">
      <rect x="20" y="20" width="80" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="60" y="42" text-anchor="middle" fill="var(--fg)">eat</text>
      <rect x="20" y="64" width="80" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="60" y="86" text-anchor="middle" fill="var(--fg)">tan</text>
      <rect x="20" y="108" width="80" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="60" y="130" text-anchor="middle" fill="var(--fg)">tea</text>
      <rect x="20" y="152" width="80" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="60" y="174" text-anchor="middle" fill="var(--fg)">bat</text>
    </g>
    <g data-cue="key">
      <path d="M100 37 L170 37" stroke="var(--accent-2)" stroke-width="2"/>
      <path d="M100 81 L170 81" stroke="var(--accent-2)" stroke-width="2"/>
      <path d="M100 125 L170 125" stroke="var(--accent-2)" stroke-width="2"/>
      <path d="M100 169 L170 169" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="170" y="20" width="80" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="210" y="42" text-anchor="middle" fill="var(--fg)">aet</text>
      <rect x="170" y="64" width="80" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="210" y="86" text-anchor="middle" fill="var(--fg)">ant</text>
      <rect x="170" y="108" width="80" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="210" y="130" text-anchor="middle" fill="var(--fg)">aet</text>
      <rect x="170" y="152" width="80" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="210" y="174" text-anchor="middle" fill="var(--fg)">abt</text>
      <text x="20" y="232" fill="var(--fg-muted)" font-size="13">key = the letters, sorted</text>
    </g>
    <g data-cue="lists">
      <path d="M250 37 L300 37" stroke="var(--accent-2)" stroke-width="2"/>
      <path d="M250 125 L275 125 L275 37" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
      <path d="M250 81 L300 81" stroke="var(--accent-2)" stroke-width="2"/>
      <path d="M250 169 L300 169" stroke="var(--accent-2)" stroke-width="2"/>
      <rect x="300" y="20" width="190" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="310" y="42" fill="var(--fg)">aet: [eat, tea]</text>
      <rect x="300" y="64" width="190" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="310" y="86" fill="var(--fg)">ant: [tan]</text>
      <rect x="300" y="152" width="190" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="310" y="174" fill="var(--fg)">abt: [bat]</text>
    </g>
  </g>
</svg>
```

```narrate
Read it from left to right. [[words]] These are the input words, one at a time. [[key]] Sort the letters of each word. Eat and tea both become a, e, t, so they get the same key. [[lists]] The dictionary uses that key to pick a list, and the word joins it. Every family ends up together, with no searching.
```

> **Why:** a dict lookup is **O(1)** on average, so each word only pays for building its key. With `n` words of length `k`, that is `O(n * k log k)`.

## Sorted key or count key?

Two keys work. Pick on purpose and say why.

| Key | Cost per word | Needs |
|---|---|---|
| `"".join(sorted(word))` | `O(k log k)` | nothing, any characters |
| `tuple` of 26 letter counts | `O(k)` | only `a` to `z` |

Start with the sorted key: short, and no assumption about the alphabet. Mention the count key as the upgrade for very long words.

> **Not this:** a `list` as the key. Lists can change, so Python refuses: `TypeError: unhashable type: 'list'`. Turn it into a `tuple` first.

> **Trap:** joining counts into one string without a separator. Counts 1 and 11 look the same as 11 and 1: both give `111`.

```narrate
Two keys work. Sorting the letters is short and works for any characters. Counting the letters costs less per word, but it only works for lowercase a to z. Start with the sorted key and mention the count key as the upgrade. One trap: a list cannot be a dictionary key, because it can change, so convert it to a tuple.
```

```quiz
q: Which value can Python use as a dict key?
options:
  - "[1, 0, 1]"
  - "(1, 0, 1)"
  - "{1, 0, 1}"
answer: 1
why: A tuple of numbers cannot change, so Python can turn it into a fixed hash for the dict. Lists and sets can change, so they cannot be keys.
```

## Your turn

Implement `group_anagrams(words)` in `group_anagrams.py`.

- Return a list of lists, in any order
- Use `defaultdict(list)` so you never ask "is the key there yet?"
- The tests send 30,000 words, so comparing words pair by pair will time out

```hint
Make the dict first: `groups = defaultdict(list)`, from `collections`.
```

```hint
The key for one word is `"".join(sorted(word))`. Put it in a small function with a clear name.
```

```hint
For every word: `groups[key].append(word)`. At the end return `list(groups.values())`.
```
