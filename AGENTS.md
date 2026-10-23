# Interview Prep - guide for coding agents

This file is for any coding agent (Claude Code, Codex, Cursor, Copilot, Gemini CLI, and others) and for human contributors. `CLAUDE.md` imports it.

## What this is

An interview-prep trainer: short narrated lessons, exercises with real tests, and tutors that read the learner's code. It runs locally as VS Code in the browser, with a VS Code extension (`apps/vscode-ext`) and an optional Gemini Live voice tutor (`apps/gemini-live`).

The **course content** lives entirely in `curriculum/`, and the **tooling** in `scripts/` and `apps/`. You can retarget the course to another audience, job or subject by editing `curriculum/` alone.

## Extending the curriculum

Follow `.claude/skills/extend-curriculum/SKILL.md`. It is plain markdown, so any agent can follow it step by step. It covers adding a lesson, a track or a role, reordering the path, retargeting the course to a new learner, and adding an exercise language.

The rules a lesson must meet live in one place, `curriculum/AUTHORING.md`, and `pnpm verify` enforces them. The learner the course is written for is described in `curriculum/LEARNER.md`.

| File | Owns |
| --- | --- |
| `curriculum/LEARNER.md` | who the course is for and how they learn |
| `curriculum/AUTHORING.md` | the lesson format and every rule `pnpm verify` checks |
| `curriculum/tracks.json` | tracks (id, title, blurb), in display order |
| `curriculum/roles.json` | target roles (id, title), used for each lesson's `roles` and the role picker |
| `curriculum/path.json` | the study cycle: which track a learner draws the next lesson from |
| `curriculum/<track>/<NN-slug>/` | one lesson: `lesson.md`, `starter/`, `solution/`, `tests/` |
| `curriculum/_kit/` | helpers shared by lessons' tests |

## Commands

```sh
pnpm install
pnpm start                 # build lessons, install the extension, open VS Code in the browser
pnpm lesson list | next | open <id> | test <id> | reset <id>
pnpm verify [track]        # structure rules, solution passes, starter fails
pnpm narrate [id-prefix]   # record voices for lessons whose scripts changed (sets up vendor/ on first run)
pnpm build                 # lessons -> dist/
```

Before every commit run `pnpm lint && pnpm stylelint && pnpm typecheck && pnpm fallow`. Run `pnpm verify` when lessons change, and `pnpm -C apps/gemini-live compile` and `test` when the Gemini app changes.

## Code style

These rules apply to the tooling (`scripts/`, `apps/`, `curriculum/_kit/`). Lesson starters and solutions follow the shorter style in `curriculum/AUTHORING.md`.

- Early returns, minimal indentation, small pure functions, functional style, async/await
- DRY with separation of concerns. Every piece of knowledge has one home, and everything else reads from it. Before writing a helper, constant or type, look for an existing one and extend it
- `for...of` instead of `.forEach`, and a plain `for` loop instead of `.reduce()`
- No comments. Rename until the code reads like the comment would
- No em dashes anywhere, use a hyphen
- A function with 2 or more params takes one destructured object (`f({ a, b }: {...})`). Exempt: key/value accessors and signatures a framework dictates (callbacks, event handlers)
- Validate loose data (files, messages, external input) with zod schemas and `safeParse`. Import `z` from `#scripts/lib/zod.ts` (in apps, `@/lib/zod.ts`), never from `zod` directly
- Inferred return types. Avoid nested try/catch and `setTimeout`
- Imports: use the `@` alias inside an app and `#scripts/*` or `#kit/*` from scripts, never `../`. Tree-shakeable modules: no barrel files and no import side effects
- Prefer semantic HTML elements over `div` plus ARIA
- Gemini Live extension: use the `browser` namespace

### Naming

- `camelCase` full words, no abbreviations. Module constants are `SCREAMING_SNAKE_CASE`
- Prefixes: `el` for elements (`elButton`), `i` for indexes (`iItem`), `is` for booleans, phrased positively (`isEnabled`)
- An event handler's first parameter is `e`
- Strings from a closed set come from one enum or `as const` object. Every number gets a named constant

### Svelte

- Inline single-use functions and single-use event handlers (`onclick={() => ...}`)
- No ternary inside `$derived`, use `$derived.by` with if/else
- A flow-gating button has both `disabled={!condition}` and a guard in its handler

### CSS

- Pure CSS over JavaScript for layout, sizing, visibility, state styling and motion. Never measure in JS and write pixels back
- Native CSS nesting. Individual `translate`/`rotate`/`scale` properties, never the `transform` shorthand
- Every animation and transition has a `prefers-reduced-motion` override. No hand-written vendor prefixes

### Message passing

Every message between two JavaScript contexts goes through `@webext-core/messaging` with a typed protocol map: `defineExtensionMessaging` between extension contexts, `defineWindowMessaging` or `defineCustomEventMessaging` from `@webext-core/messaging/page` for windows, frames and page worlds. Never call `runtime.sendMessage`, `tabs.sendMessage`, `window.postMessage` or custom DOM events by hand.

The two channels the library does not cover keep the same shape: the native messaging port (`runtime.connectNative`) and the VS Code webview channel. Type their messages in one protocol map and parse every incoming message with zod.

## Git

- `main` is the default branch
- One self-contained logical change per commit, with a message that says what changed and why
- lint-staged fails when one file has both staged and unstaged changes. Commit the whole file, or set the final version aside, commit the intermediate one, then restore it

## License

Apache License 2.0. Keep `LICENSE` and `NOTICE` in every copy and fork. `NOTICE` carries the original author's credit, and Apache 2.0 section 4(d) requires redistributions to keep it.
