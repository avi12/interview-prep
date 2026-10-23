# Interview Prep

Hands-on practice for junior interviews: backend, data analyst and AI engineer on one shared core, plus object-oriented design in practice and a reverse engineering sprinkle. Short narrated lessons, exercises with real tests, and a tutor that reads your code.

## Run it

```sh
pnpm install
pnpm start            # builds lessons, installs the extension, opens VS Code in the browser
```

VS Code opens with the next unfinished lesson on the right and your exercise file on the left. First time only: click **Trust** when VS Code asks (it is your own folder, served only to this machine, behind a token). The URL keeps the same token between runs, so you can bookmark it.

Press **Run my tests** in the lesson, or `pnpm lesson test <track>/<lesson>`. Pass and the next lesson opens. A run that never finishes (an infinite loop in your code) is stopped after 90 seconds with a hint.

## Voice

```sh
pnpm narrate          # synthesizes the spoken script of every lesson (Edge Read Aloud voices, cached)
pnpm build            # rebuilds pages with the audio
```

Every narrated card has a play button. Parts of each diagram light up as the voice reaches them.

## Tutors

- **Claude Code**: the **Ask Claude** button (or `claude` then `/tutor`) opens a Socratic coach that reads your lesson, your code and your progress. It gives hints in steps, reviews against the project style, and runs mock interviews
- **Gemini Live**: `apps/gemini-live` is a Chrome extension that lets Gemini watch your VS Code tab and talk you through it. See its README

## Layout

| Path | What |
| --- | --- |
| `curriculum/<track>/<NN-slug>/` | `lesson.md`, `starter/`, `solution/`, `tests/` |
| `curriculum/_kit/` | helpers lessons share: implementation loading, Postgres (PGlite), fake LLM, mutation checks, seeded random, timing, bookstore Money |
| `curriculum/AUTHORING.md` | how to write a lesson (enforced by `pnpm verify`) |
| `work/` | your copies of the exercises (git-ignored) |
| `.progress/` | what you passed (git-ignored) |
| `scripts/` | CLI (`pnpm lesson`), build, narrate, verify, start; `scripts/lib` holds the shared helpers |
| `apps/vscode-ext/` | the VS Code extension |
| `apps/gemini-live/` | the Gemini Live bridge |

## Commands

```sh
pnpm lesson list | next | open <id> | test <id> | reset <id>
pnpm verify [track]        # every solution passes, every starter fails, structure rules hold
pnpm typecheck             # scripts, curriculum and every solution (run pnpm verify first)
pnpm build                 # lessons -> dist/
```

## Why it is built this way

- Short cards (130 words max), a picture on each, a voice that walks it: the course is built for someone who loses the thread in long text
- Every lesson names the rejected alternative and its cost, because interviews ask "why not X?"
- Every exercise ships a failing starter and a passing solution, checked by `pnpm verify`, so a green test means something
- SQL runs on real Postgres in-process (PGlite), AI exercises use a scripted fake model, so nothing needs a key or a network

The default order puts SQL first, then tests and APIs, then each role's branch. Change it in `curriculum/path.json`.
