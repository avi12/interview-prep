# Interview Prep

Hands-on practice for junior interviews: backend, data analyst and AI engineer on one shared core, plus object-oriented design in practice and a reverse engineering sprinkle. Short narrated lessons, exercises with real tests, and a tutor that reads your code.

Created by [Avi](https://avi12.com).

![The trainer: lessons by track on the left, the exercise file in the middle, the lesson on the right](https://github.com/user-attachments/assets/b81aafcc-1670-4b79-aa65-70321c254e56)

## Requirements

- Node 24 or newer, and pnpm
- Python 3.13 with `pip install -r requirements.txt` (for the Python lessons)
- VS Code with its `code` command on your PATH (the trainer runs `code serve-web`)

## Run it

```sh
pnpm install
pnpm start            # builds lessons, installs the extension, opens VS Code in the browser
```

VS Code opens with the next unfinished lesson on the right and your exercise file on the left. First time only: click **Trust** when VS Code asks (it is your own folder, served only to this machine, behind a token). The URL keeps the same token between runs, so you can bookmark it.

Press **Run my tests** in the lesson, or `pnpm lesson test <track>/<lesson>`. Pass and the next lesson opens. A run that never finishes (an infinite loop in your code) is stopped after 90 seconds with a hint.

## Voice

```sh
pnpm narrate          # records the spoken script of every lesson with Edge Read Aloud voices, cached
pnpm build            # rebuilds pages with the audio
```

Every narrated card has a play button. Parts of each diagram light up as the voice reaches them.

![A card being narrated: the diagram's parts light up in the order the voice names them, with live subtitles](https://github.com/user-attachments/assets/0c1d2aee-c568-4f8d-a663-03d507ca85aa)

The voices come from [edge-tts-as-extension](https://github.com/avi12/edge-tts-as-extension), a git submodule in `vendor/`. The first `pnpm narrate` checks it out and installs it, with no other setup.

## Tutors

- **Claude Code**: the **Ask Claude** button (or `claude` then `/tutor`) opens a Socratic coach that reads your lesson, your code and your progress. It gives hints in steps, reviews against the project style, and runs mock interviews
- **Gemini Live**: a voice tutor that watches your VS Code and talks you through it. Click **Voice tutor** in the VS Code status bar. It runs either on your own Gemini API key (no extension needed) or on your Gemini subscription through the `apps/gemini-live` Chrome extension. See [Gemini Live](#gemini-live)

## Gemini Live

The voice tutor talking through a lesson in real time:

https://github.com/user-attachments/assets/5054318b-fd63-47ef-8363-2ae6b4b1abcf

> [!WARNING]
> The subscription engine rides your Gemini subscription through Google's own web client, which Google doesn't offer for this use. **Google may suspend or ban an account that uses it.** If you'd rather not risk your account, use [your own Gemini API key](apps/gemini-live/README.md#use-your-own-api-key) - the official, public Live API.

- **Your API key** (no extension): click **Voice tutor** in the status bar. The page that opens asks for a key once ([create a free one in Google AI Studio](https://aistudio.google.com/apikey)) and keeps it in VS Code's secret storage. A `GEMINI_API_KEY` environment variable, if set, takes precedence
- **Your Gemini subscription**: sideload the extension (the same page walks you through it, or see [its README](apps/gemini-live/README.md#install)). Once it is installed, its popup switches between the subscription and your API key

## Layout

| Path | What |
| --- | --- |
| `curriculum/<track>/<NN-slug>/` | `lesson.md`, `starter/`, `solution/`, `tests/` |
| `curriculum/_kit/` | helpers lessons share: implementation loading, Postgres (PGlite), fake LLM, mutation checks, seeded random, timing, bookstore Money |
| `curriculum/LEARNER.md` | who the course is written for |
| `curriculum/AUTHORING.md` | how to write a lesson (enforced by `pnpm verify`) |
| `curriculum/tracks.json`, `roles.json`, `path.json` | tracks, target roles and the study order |
| `work/` | your copies of the exercises (git-ignored) |
| `.progress/` | what you passed (git-ignored) |
| `scripts/` | CLI (`pnpm lesson`), build, narrate, verify, start; `scripts/lib` holds the shared helpers |
| `apps/vscode-ext/` | the VS Code extension |
| `apps/gemini-live/` | the Gemini Live bridge |
| `vendor/edge-tts-as-extension/` | the voice tool (git submodule) |

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

## Make it yours

The course is data in `curriculum/`, so you can add lessons, tracks and roles, or retarget it to another job or subject, without touching the tooling.

- **With a coding agent:** ask it to extend the curriculum. Claude Code has the `/extend-curriculum` skill, and other agents read `AGENTS.md`, which points to the same steps
- **By hand:** follow `.claude/skills/extend-curriculum/SKILL.md`, then `curriculum/AUTHORING.md`. `pnpm verify` tells you when a lesson is right

## License

[Apache License 2.0](LICENSE). Copyright 2026 [Avi](https://avi12.com).

You may use, change and share this project, including commercially. If you fork it or redistribute it, keep the [`NOTICE`](NOTICE) file and its credit to the original author, as section 4(d) of the license requires, and mark the files you changed.
