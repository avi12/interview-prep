---
name: extend-curriculum
description: Add or change course content - a new lesson, a new track, a new target role, a different study order - or retarget the whole course to another audience, job or subject. Use when someone wants the curriculum to cover something it does not, or to fit their own interview or learning goals. Everything happens in curriculum/, and the tooling needs no change except to add an exercise language.
---

# Extend the curriculum

The course content is data in `curriculum/`, and the tooling reads it. Adding content never needs a code change, unless you add a new exercise language (see the last section).

## First, read

1. `curriculum/LEARNER.md` - who the course is written for. If the user is retargeting the course, this file changes first
2. `curriculum/AUTHORING.md` - the lesson format and every rule `pnpm verify` checks. It is the single source for those rules, so do not restate them, follow them
3. The exemplar lessons that AUTHORING.md names, in the language you are about to write
4. `curriculum/tracks.json`, `curriculum/roles.json` and `curriculum/path.json` - what exists now

Ask the user only what you cannot read: which topic, which role or audience, and which language for the exercises.

## Add a lesson to an existing track

1. Pick the folder name `curriculum/<track>/<NN-slug>/`. Lessons in a track sort by folder name, so the number sets the position. To slot one in between, use a sorting prefix such as `000a` or `00ab`, which sorts before `01`
2. Research the facts from official sources and list them in `sources`
3. Write `lesson.md` (cards, narrate blocks, diagrams, quiz, hints), then `starter/`, `solution/` and `tests/` per AUTHORING.md. Reuse `curriculum/_kit/` before writing a test helper
4. Set `roles` to ids from `roles.json`
5. Run `pnpm verify <track>` and fix every problem until it is green: structure rules hold, the solution passes and the starter fails

## Add a track

1. Add `{ "id", "title", "blurb" }` to `curriculum/tracks.json`. The array order is the order tracks appear in the lesson tree
2. Create `curriculum/<id>/` and add lessons as above
3. Add the track id to `curriculum/path.json` (see "Change the study order")

## Add or change a target role

1. Edit `curriculum/roles.json`: `{ "id", "title" }`. The id is what lessons list in `roles`, and the title is what the role picker in VS Code shows
2. Tag the lessons that matter for that role. `pnpm verify` rejects a lesson that names a role missing from `roles.json`
3. To rename or remove a role, update every lesson's `roles` that names it (search `roles:` in `curriculum/**/lesson.md`)

## Change the study order

`curriculum/path.json` is a cycle of track ids. The next-lesson order is built by walking the cycle again and again, taking the next unused lesson from each listed track, until every track runs out. A track listed twice in one cycle advances twice as fast. Tracks missing from the cycle are appended at the end. Each role gets its own order, built the same way from only that role's lessons.

## Retarget the whole course

For another audience (seniors, students, a different job) or another subject:

1. Rewrite `curriculum/LEARNER.md`: who, target roles, languages, how they learn, what their interviews or exams look like
2. Rewrite `roles.json` and `tracks.json`, then `path.json`
3. Keep the tracks that still fit, delete the ones that do not (`git rm -r curriculum/<track>`), and add new ones
4. Optionally adjust the limits in `curriculum/AUTHORING.md` and the matching constants in `scripts/lib/validate.ts` (card length, narration length) if your learner is served better by other limits. Change both together, because verify enforces the constants
5. Run `pnpm verify` for everything

## After the content is green

```sh
pnpm narrate <track>/<slug>   # records voices for changed scripts only; first run sets up vendor/
pnpm build                    # rebuilds the pages the trainer shows
```

Narration is optional: a lesson without recorded audio still works, it just has no voice. Then open the trainer (`pnpm start`) and look at the new lesson: does every diagram read at rest, do the cues light up in order while the voice plays, does the exercise open on the left.

## Add an exercise language

This is the one change that touches tooling. Today `lang` is `ts`, `py`, `sql` or `none`.

1. Add the value to `Lang` in `scripts/lib/schema.ts`
2. In `scripts/lib/run.ts`, `commandFor` picks the test runner for a language. Add the new runner there. It receives the learner's folder in the `IMPL_DIR` environment variable
3. Add a loader to `curriculum/_kit/` that reads the learner's file from `IMPL_DIR`, like `impl.ts` and `impl.py`, and document it in AUTHORING.md under Exercises
4. Write one exemplar lesson in the new language and list it in AUTHORING.md
5. Run `pnpm lint && pnpm typecheck && pnpm verify`

## Done means

- `pnpm verify` is green for every track you touched
- `LEARNER.md`, `roles.json`, `tracks.json` and `path.json` agree with the lessons on disk
- Each change is its own commit: one lesson or one track per commit, with a message that says what and why
