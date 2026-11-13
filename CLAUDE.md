@AGENTS.md

# Claude Code

- `/tutor` coaches the learner through a lesson, a failing test, a code review or a mock interview
- `/extend-curriculum` adds or changes lessons, tracks and roles, or retargets the course

# Deploy

After every modification, once the pre-commit checks from AGENTS.md pass, run `pnpm deploy:web` on your own without asking. Do not wait for the user to request it.

# Linting

`pnpm lint` runs `avi12-lint` (shared config from `avi12/lint-config`); `pnpm lint:fix` fixes what it can
`.oxlintrc.json` is JSON and has no reason field, so the reasons for its `house/positional-parameters` exemptions live here; the rule stays on everywhere else

- `scripts/lib/query-result.ts`, `render.ts`, `text-table.ts`: local callbacks handed to `Array.map`, whose `(value, index)` signature is fixed by the language
- `apps/web/src/runner/ts/expect.ts`, `host-modules.ts`, `node/**`: mirror Node, Vitest and Jest APIs whose positional signatures learner code calls unchanged
- `apps/web/src/test/memory-storage.ts`: implements the Web `Storage` interface (`setItem(key, value)`)
- `apps/vscode-ext/src/storageMemento.ts`, `src/test/vscodeFake.ts`, `src/extension.ts`: implement or fake the VS Code `Memento` and extension API signatures
- `apps/web/server/security.ts`: Hono middleware signature `(context, next)`
- `apps/gemini-live/src/lib/live-api/mic-worklet.ts`, `scripts/cdp.ts`: AudioWorklet and Chrome DevTools Protocol signatures dictated by the platform
- `curriculum/_kit/fakeModel.ts`: fakes a model client with the vendor SDK's positional methods
