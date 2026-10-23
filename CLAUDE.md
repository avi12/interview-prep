# Coding principles
Follow the Code style, Naming, Hardcoded values, Svelte and CSS sections of `C:\repositories\avi\youtube-time-manager\CLAUDE.md` (skip its extension, GA4, Convex and store-deploy parts). Highlights: early returns, minimal indentation, DRY + separation of concerns, functional style, for-of instead of forEach/reduce, destructured object param for 2+ args, `is`-prefixed positive booleans, constants/enums for magic values, zod for loose data, inferred return types, no comments, `@` alias, tree-shakeable modules (no barrels, no import side effects), pure CSS over JS.
Also follow `~/.claude/CLAUDE.md` (SSOT, artifact skin, narration).

# Message passing
Every message between two JavaScript contexts anywhere in the project goes through `@webext-core/messaging` with a typed protocol map:
- Extension contexts (background, popup, content scripts, extension pages): `defineExtensionMessaging`.
- Windows, frames and page worlds (MAIN and ISOLATED, iframes, any web page): `defineWindowMessaging` or `defineCustomEventMessaging` from `@webext-core/messaging/page`.

Never call `runtime.sendMessage`, `runtime.onMessage`, `tabs.sendMessage`, `window.postMessage`, `addEventListener("message")` or custom DOM events by hand. Only where the library has no transport, keep the same shape: a native messaging port (`runtime.connectNative`) and the VS Code webview to extension host channel (`acquireVsCodeApi().postMessage` / `webview.onDidReceiveMessage`). Type their messages in one protocol map and parse every incoming message with zod.

# Project
Interview-prep trainer. Roles: backend, data analyst, AI engineer on one shared core. Languages: TypeScript and Python. Trainer: local web app + Claude Code, with Gemini Live as voice tutor (pattern in `C:\repositories\avi\learn-math-5-units`).
