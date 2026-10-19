---
title: Source maps and VLQ
lang: ts
minutes: 30
level: junior
roles: [backend, analyst, ai]
files: [sourceMap.ts]
sources:
  - https://tc39.es/ecma426/
  - https://developer.chrome.com/docs/devtools/javascript/source-maps
  - https://developer.mozilla.org/en-US/docs/Glossary/Minification
---

## A map from minified back to original

An error says `app.min.js:1:48213`. Useless: the whole bundle is one line.

A **source map** is a JSON file that links every position in the generated file to a position in the original source. Browsers load it when the bundle ends with a `//# sourceMappingURL=` comment. DevTools then shows your original code (Chrome docs).

```svg Generated line 0, column 14 maps to original file greet.ts, line 1, column 2
<svg viewBox="0 0 520 190" role="img" aria-label="A source map links a generated position to an original position">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="generated">
      <rect x="10" y="30" width="200" height="70" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="110" y="52" text-anchor="middle" fill="var(--fg-muted)">app.min.js</text>
      <text x="110" y="78" text-anchor="middle" fill="var(--fg)">line 0, col 14</text>
    </g>
    <g data-cue="map">
      <path d="M214 65 L300 65 M292 58 L300 65 L292 72" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="257" y="52" text-anchor="middle" fill="var(--accent-2)">mappings</text>
    </g>
    <g data-cue="original">
      <rect x="306" y="30" width="200" height="70" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="406" y="52" text-anchor="middle" fill="var(--fg-muted)">src/greet.ts</text>
      <text x="406" y="78" text-anchor="middle" fill="var(--fg)">line 1, col 2</text>
    </g>
    <text x="10" y="150" fill="var(--fg-muted)">lines and columns both count from 0</text>
  </g>
</svg>
```

```narrate
An error in a minified file points at one giant line, which tells you nothing. A source map fixes that. [[generated]] On the left is a position in the file the browser runs. [[map]] The map is the lookup table in the middle. [[original]] On the right is the matching position in the code the developer wrote. If a site leaves its map online, you can read its original source.
```

> **Why:** for reverse engineering, a published map is a gift. With `sourcesContent` filled in, it holds the **entire original source**. Teams that want code private must not deploy maps.

## What is inside the file

```json
{
  "version": 3,
  "file": "out.min.js",
  "sources": ["src/greet.ts"],
  "sourcesContent": ["function greet(name) { ... }"],
  "names": ["greet", "name"],
  "mappings": "AAAAA,SAASA,EAAMC,GACb,MAAO,WAAWA"
}
```

| Field | Holds |
|---|---|
| `sources` | original file names |
| `sourcesContent` | optional: the original text itself |
| `names` | original identifiers, for renamed ones |
| `mappings` | **all the positions**, as one string |

Everything is a plain list except `mappings`. That string is the puzzle.

```narrate
The file is ordinary JSON. Sources lists the original files, names lists identifiers that the minifier renamed, and sources content may even carry the original text. Everything here is a plain list except the last field. Mappings packs every position into a single string of letters, and reading that string is the real work.
```

## The mappings string

```svg Reading AAAA,IAAM;AACA: a semicolon starts a new generated line, a comma starts a new segment, each segment has up to five fields
<svg viewBox="0 0 520 210" role="img" aria-label="Structure of a mappings string">
  <g font-family="var(--font-mono)" font-size="20">
    <text x="20" y="40" fill="var(--fg)">AAAA</text>
    <text x="92" y="40" fill="var(--fg-muted)">,</text>
    <text x="108" y="40" fill="var(--fg)">IAAM</text>
    <text x="182" y="40" fill="var(--accent-2)">;</text>
    <text x="198" y="40" fill="var(--fg)">AACA</text>
  </g>
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="lines">
      <path d="M186 50 L186 78" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="20" y="96" fill="var(--fg)">; = next generated line (line 0, then line 1)</text>
    </g>
    <g data-cue="segments">
      <path d="M96 50 L96 110" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="126" fill="var(--fg)">, = next segment on the same line</text>
    </g>
    <g data-cue="fields">
      <rect x="20" y="140" width="476" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="160" fill="var(--fg)">segment = generated col, source, orig line, orig col, name</text>
      <text x="30" y="180" fill="var(--fg-muted)">IAAM = +4, +0, +0, +6 (all are changes)</text>
    </g>
  </g>
</svg>
```

```narrate
Look at this short example. [[lines]] A semicolon ends a generated line, so this map covers two lines. [[segments]] A comma separates segments on the same line, each one marking a spot in the generated code. [[fields]] A segment holds up to five numbers: the generated column, which source file, the original line, the original column, and optionally a name. Every number is a change from the previous one.
```

> **Not this:** absolute numbers. `line 1200, column 40000` costs many characters per segment. Changes are small, often one letter.

> **Trap:** only the generated column restarts at each `;`. The other four keep their running totals across lines.

## Base64 VLQ: a number in a few letters

**VLQ** means variable-length quantity: small numbers take one letter, big numbers take more. Each letter is a 6-bit Base64 digit.

- Top bit: **continue**, more digits follow
- First digit: 4 value bits, then a **sign** bit (1 means negative)
- Later digits: 5 value bits each, placed higher

```svg Decoding iB: the letter i says continue, 4 value bits give 1, the letter B adds 1 shifted by 4, total 17
<svg viewBox="0 0 520 230" role="img" aria-label="Bit layout of the VLQ letters i and B">
  <g font-family="var(--font-mono)" font-size="15" text-anchor="middle">
    <text x="30" y="34" fill="var(--fg-muted)" text-anchor="start">i = 100010</text>
    <g data-cue="continue">
      <rect x="20" y="46" width="44" height="34" fill="var(--accent-2)" fill-opacity="0.35" stroke="var(--border)" stroke-width="2"/>
      <text x="42" y="69" fill="var(--fg)">1</text>
      <text x="42" y="98" fill="var(--fg-muted)" font-size="11">continue</text>
    </g>
    <g data-cue="value">
      <rect x="66" y="46" width="44" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="88" y="69" fill="var(--fg)">0</text>
      <rect x="112" y="46" width="44" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="134" y="69" fill="var(--fg)">0</text>
      <rect x="158" y="46" width="44" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="180" y="69" fill="var(--fg)">0</text>
      <rect x="204" y="46" width="44" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="226" y="69" fill="var(--fg)">1</text>
      <text x="156" y="98" fill="var(--fg-muted)" font-size="11">4 value bits = 1</text>
    </g>
    <g data-cue="sign">
      <rect x="250" y="46" width="44" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="272" y="69" fill="var(--fg)">0</text>
      <text x="272" y="98" fill="var(--fg-muted)" font-size="11">sign: plus</text>
    </g>
    <text x="30" y="132" fill="var(--fg-muted)" text-anchor="start">B = 000001</text>
    <g data-cue="second">
      <rect x="20" y="144" width="44" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="42" y="167" fill="var(--fg)">0</text>
      <rect x="66" y="144" width="228" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="180" y="167" fill="var(--fg)">00001 = 1, shifted up by 4</text>
    </g>
    <g data-cue="total">
      <text x="30" y="212" fill="var(--ok)" text-anchor="start" font-size="17">1 + 1 x 16 = 17</text>
    </g>
  </g>
</svg>
```

```narrate
Decode the two letters i and B. [[continue]] The first bit of i is one, so another digit follows. [[value]] The next four bits give the value one. [[sign]] The last bit is zero, so the number is positive. [[second]] The letter B has no continue bit, and its value is one, but it sits four places higher, which makes it sixteen. [[total]] One plus sixteen is seventeen.
```

> **Why:** most changes between neighbouring positions are tiny. Deltas plus VLQ make a big map a small file.

```quiz
q: In the map AAAA,IAAM what is the generated column of the second segment?
options:
  - 0
  - 4
  - 8
answer: 1
why: The first field of IAAM is I, which decodes to plus 4, and the previous segment started at column 0.
```

## From a position to the source

Two steps, and the second one is easy:

1. Decode the whole string into segments with **running totals**
2. On the generated line, pick the **last segment whose column is at or before yours**

A segment covers everything until the next one starts. Return that segment's original position as it is, without adding the distance.

> **Not this:** scanning for an exact column match. Most columns have no segment of their own, and you would return nothing.

> **Trap:** stack traces usually count from 1. The map counts from 0. Subtract first.

```narrate
Finding an original position takes two steps. First decode the string into segments, keeping running totals for the four fields that carry over. Second, on your generated line, pick the last segment that starts at or before your column. It covers your spot until the next one begins, so return its original position as it is. At scale, decode once and use binary search.
```

```quiz
q: A site serves app.js.map with sourcesContent filled in. What can any visitor do?
options:
  - Nothing, maps are binary
  - Read the original source files
  - Only see the minified code
answer: 1
why: A map is plain JSON, and sourcesContent holds the original text of every file.
```

## Your turn

Open `sourceMap.ts`. Implement two functions. Lines and columns count from **0**.

- `decodeMappings(mappings)`: returns one list per generated line. Each segment is `{ generatedColumn, sourceIndex, originalLine, originalColumn, nameIndex }`, with `null` for fields it does not have. Throw on a character outside Base64 or a segment of 2 or 3 fields
- `originalPositionFor({ sourceMap, generatedLine, generatedColumn })`: returns `{ source, line, column, name }` or `null` when nothing maps there (no such line, column before the first segment, or an unmapped one-field segment)

The tests use small hand-checked maps (including the spec's `iB` = 17) and 40 seeded random lines.

```hint
Write a small `decodeValues(text)` first: it turns "iB,..." style letters into a list of numbers using the continue bit and the sign bit.
```

```hint
In `decodeMappings`, split on `;` for lines and `,` for segments. Keep `generatedColumn` per line, and the other four running totals outside the line loop.
```

```hint
For the lookup, use `segments.findLast(segment => segment.generatedColumn <= column)`, then return null if it is missing or has no source.
```
