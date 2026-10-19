---
title: Edge cases and boundaries
lang: ts
minutes: 20
level: junior
roles: [backend, analyst, ai]
files: [paginate.test.ts]
sources:
  - https://martinfowler.com/articles/practical-test-pyramid.html
  - https://stryker-mutator.io/docs/
  - https://vitest.dev/api/test.html
---

## Bugs live on the border

A page is a slice of a list: page 1 of size 3 is items 1 to 3. The classic slip is `<` versus `<=`.

```ts
hasNextPage: page < totalPages
hasNextPage: page <= totalPages
```

With 3 pages, both lines agree on page 1 and page 2. They differ **only on page 3**, the last one. A test in the comfortable middle cannot tell them apart.

```svg Pages as boxes in a row. The risky values sit at the borders, not in the middle
<svg viewBox="0 0 520 190" role="img" aria-label="Page numbers with borders marked">
  <g font-family="var(--font-mono)" font-size="14" text-anchor="middle">
    <g data-cue="invalid">
      <rect x="30" y="64" width="60" height="44" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="60" y="92" fill="var(--fg)">-1</text>
      <rect x="96" y="64" width="60" height="44" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
      <text x="126" y="92" fill="var(--fg)">0</text>
      <text x="93" y="44" fill="var(--fg-muted)">not a page</text>
    </g>
    <g data-cue="first">
      <rect x="162" y="64" width="60" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="192" y="92" fill="var(--fg)">1</text>
      <text x="192" y="44" fill="var(--fg-muted)">first</text>
    </g>
    <rect x="228" y="64" width="60" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="258" y="92" fill="var(--fg)">2 ...</text>
    <g data-cue="last">
      <rect x="294" y="64" width="60" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="324" y="92" fill="var(--fg)">N</text>
      <text x="324" y="44" fill="var(--fg-muted)">last</text>
    </g>
    <g data-cue="past">
      <rect x="360" y="64" width="60" height="44" fill="var(--surface-3)" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="390" y="92" fill="var(--fg)">N+1</text>
      <text x="390" y="44" fill="var(--fg-muted)">past the end</text>
    </g>
    <text x="30" y="150" text-anchor="start" fill="var(--fg)">test the borders: 0 and 1, N and N+1</text>
  </g>
</svg>
```

```narrate
Picture the page numbers as boxes in a row. [[invalid]] On the left are values that are not pages at all: zero and below. [[first]] Page one is the first real edge. [[last]] The last page is the second edge. [[past]] One step further is a page that does not exist. Bugs sit on these borders, so put your tests there, not in the comfortable middle.
```

> **Why:** an off-by-one slip changes the answer at exactly one value. Only a test on that value can see it.

## Group the inputs

An **equivalence class** is a group of inputs the code treats the same way. One example per class is enough. Then add the values on the **border between** classes.

| Class | Example | Expected |
|---|---|---|
| Middle page | page 2 of 3 | its items |
| Last page, partly full | page 3 of 7 items | leftovers |
| Past the end | page 9 | no items |
| Zero | page 0 | error |
| Negative | page -1 | error |
| Not whole | page 1.5 | error |

> **Not this:** ten tests with pages 2, 3, 4, 5 and so on. They share one class, so they catch what one test catches.

```narrate
Look at the table. Each row is a kind of input that the code treats the same way. Test one example from each kind, instead of ten examples from the same kind. Then add the values on the border between kinds, such as page zero next to page one.
```

```quiz
q: Which pair of page values best tests the border between invalid and valid?
options:
  - 2 and 3
  - 0 and 1
  - -5 and 5
answer: 1
why: Zero is the last invalid value and one is the first valid value, so a slip such as page < 0 instead of page < 1 shows up right there.
```

## Zero, one, many, too many

Run every function through the same checklist:

| Situation | Example | Why it breaks code |
|---|---|---|
| Empty | `[]` | divides or indexes into nothing |
| Exactly full | 6 items, size 3 | a rounding slip adds a phantom page |
| One over | 7 items, size 3 | the last page is partly filled |
| Beyond the end | page 9 of 3 | slice runs past the list |
| Invalid | 0, -1, 1.5, size 0 | no guard, or a guard one off |

> **Trap:** testing only valid input. Errors are where crashes live, and a guard that is off by one still looks fine on page 1.

```narrate
Here is a checklist you can reuse on any function. Empty, exactly full, one over, beyond the end, and invalid. Each row names the kind of slip it catches. The trap is to test only valid input, because a guard that is off by one still looks fine on the happy path.
```

> **Why:** edge tests are cheap to write and expensive to skip. They cover the places where real code fails.

## Your turn

Open `paginate.test.ts`. `paginate.ts` sits next to it; read it, do not change it.

`paginate({ items, page, pageSize })` returns `{ items, page, totalPages, hasNextPage }`.

- Pages start at 1
- A page past the end gives no items
- An empty list has 0 pages
- `page` and `pageSize` must be whole numbers of 1 or more, else `RangeError`

Run `pnpm lesson test testing/02-edge-cases-and-boundaries`. Your tests must pass on the correct code and go red on **10 buggy copies**. Use 8 or more tests with names of 3 or more words.

```hint
Walk the checklist card one row at a time: empty, exactly full, one over, beyond the end, invalid.
```

```hint
A border needs a test on each side: page 0 and page 1, the last page and the page after it.
```

```hint
The check prints the name of each bug that got through. Typical gaps: a fractional page, a page size of 0, an empty list, a full last page, the last page's hasNextPage.
```
