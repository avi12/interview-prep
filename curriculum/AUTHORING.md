# Authoring a lesson

The learner is a career changer preparing for junior interviews. They struggle to concentrate on long text, learn best from pictures and doing, and want to know **why this way and not another way**. Every lesson serves that.

Read the three exemplars before writing anything. They define the format:

- `foundations/01-two-sum` (TypeScript)
- `foundations/02-valid-parentheses` (Python)
- `sql/01-top-n-per-group` (SQL on real Postgres)

## Folder

```
curriculum/<track>/<NN-slug>/
  lesson.md
  starter/<file>      what the learner receives (must FAIL the tests)
  solution/<file>     the model answer (must PASS the tests)
  tests/<tests>       TS/SQL: *.test.ts (vitest)   Python: test_*.py (pytest)
```

Reading-only lessons use `lang: none` and need no starter, solution or tests.

## lesson.md

Frontmatter: `title`, `lang` (`ts` | `py` | `sql` | `none`), `minutes` (5-60, honest), `level` (`junior` | `mid`), `roles` (any of `backend`, `analyst`, `ai`), `files` (the files the learner edits, first one opens), `sources` (real URLs you read, official docs first).

Body is a list of **cards**. A card starts at `## Title`. Rules enforced by `pnpm verify`:

- 4 or more cards. The last card of an exercise lesson is exactly `## Your turn`
- At most **130 words of prose per card** (code, tables and diagrams do not count). Short cards are the whole point
- Every card except `Your turn` has a fenced `narrate` block: the script a voice reads aloud, 15 to 110 words
- At least one `> **Why:** ...` callout and one `> **Not this:** ...` callout (the rejected alternative and why it loses). `> **Trap:** ...` is optional and used for common mistakes
- At least one `svg` diagram and one `quiz`
- `Your turn` has at least 2 progressive `hint` blocks
- At least one real `sources` URL. No em dashes anywhere (use a hyphen)

### Special fences

````
```narrate
Plain spoken sentences. No symbols, code, paths or hex. Spell out abbreviations the first time. Numbers as they are said. [[cue]] markers go right before the words that introduce a diagram part.
```

```svg A one-line caption that carries the meaning
<svg viewBox="0 0 520 200">...</svg>
```

```quiz
q: Question?
options:
  - first
  - second
answer: 1
why: One sentence on why that option is right.
```

```hint
Progressive nudge. The first is gentle, the last nearly gives it away.
```
````

### Diagrams

- Plain inline SVG, no blank lines inside, `viewBox` set, no fixed width. Colors only from tokens: `var(--fg)`, `var(--fg-muted)`, `var(--border)`, `var(--primary)`, `var(--primary-container)`, `var(--surface-2)`, `var(--surface-3)`, `var(--accent-2)`, `var(--ok)`, `var(--danger)`, `var(--cat-1)` to `var(--cat-7)`. Text uses `font-family="var(--font-mono)"`. Never hard-code a hex color
- A diagram shows the **mechanism** (data moving, state changing, steps in order), not decoration
- Narration and diagram are choreographed: wrap each part in an element with `data-cue="name"`, and put `[[name]]` in the narrate script right before the words that introduce it. Every cue in the script must exist in the diagram and vice versa (checked)
- Keep the key parts out of the bottom right corner of the diagram

### Writing

- Plain words. Define a term the first time. Short sentences. Bullets over paragraphs
- Name the interview angle: what the interviewer is really testing, what to say out loud
- Teach the reason: every "do it this way" has a "because". Show the naive version, show the cost, then show the better one
- Facts must be **researched**, not remembered. Read official docs (MDN, PostgreSQL docs, OWASP, RFCs, vendor docs) and list them in `sources`. Prefer current guidance (2026)
- No filler, no motivational talk

## Exercises

- The learner edits `work/<track>/<slug>/<file>`, a copy of `starter/`. Tests read the implementation through the kit, never by a fixed relative path:
  - TypeScript: `import { loadImpl } from "#kit/impl.ts"` then `await loadImpl({ testUrl: import.meta.url, file: "x.ts" })`
  - Python: `from impl import load_impl` then `load_impl(__file__, "x.py")`
  - SQL: `import { openDb, runQueryFile } from "#kit/db.ts"` (real Postgres via PGlite). The learner writes a `.sql` file. Run it on **two different datasets** so a hard-coded answer fails
- The **starter must fail** the tests and the **solution must pass** them. `pnpm verify <track>` checks both
- Tests must prove the lesson's point. If complexity is the point (brute force vs hash map), include a size where the naive version times out
- Tests have readable names that say what behavior failed. Test the behavior, not the implementation
- Deterministic: no network, no real clocks (inject them), no randomness without a seed, no real LLM calls (use scripted fakes), no files outside the lesson
- Available without installing: Node 24, vitest, zod, `@electric-sql/pglite`, `node:crypto`, `node:http`, `node:sqlite`; Python 3.13 with pytest, pandas, numpy, scipy, fastapi, httpx, pydantic, requests. Do not add dependencies
- Interview-style functions (LeetCode) keep the signature an interviewer would give, positional. Everything else follows the code style below
- One focused skill per lesson, 10 to 25 minutes. Solvable by the learner without the solution; hints cover the gap

## Code style (starter and solution show the habits we want)

Derived from the project's CLAUDE.md. In short: early returns and minimal nesting, small pure functions, descriptive full-word names and zero comments, `for...of` instead of `.forEach`/`.reduce`, 2+ params as one destructured object (except a given interview signature), no magic numbers (named `SCREAMING_SNAKE_CASE` constants), `is`-prefixed positive booleans, inferred return types in TypeScript. Python: PEP 8, type hints optional, same early-return and naming habits.

## Verify before you finish

```
pnpm verify <track>          # structure + solution passes + starter fails
```

Everything must be green. Do not run git; the maintainer commits. Do not edit files outside your own track folders.
