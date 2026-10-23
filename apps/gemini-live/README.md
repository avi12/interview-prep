# Gemini Live tutor

A Chrome extension that gives the trainer a voice tutor which sees your VS Code. Press Start: a small Gemini window opens, the tutor is briefed once, and Gemini Live then follows what you do while you talk. It reads an exact text copy of the lesson, your file and your last test run, and sees a picture of the lines around your cursor.

The design is ported from `learn-math-5-units/apps/extension` (the same author's code). There the tutor looked at a pad drawn by the page; here it looks at a screenshot of the VS Code tab.

## Install

```
pnpm install                                   # repo root
pnpm --filter @interview-prep/gemini-live build
```

Then in Chrome: `chrome://extensions`, turn on Developer mode, Load unpacked, pick `apps/gemini-live/.output/chrome-mv3`.

You also need to be signed in to Google in that Chrome, so the Gemini window can start Live.

## Use

1. `pnpm start` at the repo root. It prints the VS Code URL (`http://127.0.0.1:8765/?tkn=...`) and opens your default browser. If that is not the Chrome with the extension, run `pnpm start --no-open` and paste the URL into Chrome yourself.
2. A **Start voice tutor** button now sits at the bottom right of the VS Code page itself, with the tutor's status beside it. The popup does the same and also holds the language. Start is refused until a tab on `http://127.0.0.1:8765` exists.
3. Pick the tutor language (English by default, Hebrew optional). It applies to the next session.
4. Press Start. Allow the microphone in the Gemini window when Chrome asks.
5. Talk. Keep the VS Code tab in front in its window: Gemini only gets a picture while that tab is the visible one. The popup says so when it is not.
6. Stop in the popup, or just close the Gemini window or the VS Code tab. Any of them ends the session.

The tutor is briefed as a warm, patient teacher: it trusts the text copy for every word and line of code, keeps the hints and quiz answers to itself until you have tried, asks a Socratic question before giving an answer, explains why this approach and not another, keeps replies short, never writes the answer for you, and nudges early returns, descriptive names and named constants. The brief names the open file or lesson, read from the VS Code tab title (`<file or lesson> - <folder> - Visual Studio Code`). When the title says nothing, the brief tells the tutor to read the screen.

## How it works

```
popup --LIVE_START--> worker --opens--> Gemini window (gemini.google.com/glic)
                       |                     |
                       |        bridge (page world) <-DOM events-> relay (extension world)
                       |                     |
                       |<-- tutor view? -----+  every second: has anything changed?
  fetch 127.0.0.1:8766/tutor-view (VS Code extension: lesson notes, file, cursor, tests)
                       |                     |  changed and settled for 1.2 s: new shared-tab id
                       |                     |  -> Gemini pulls the page content (text) and a picture
                       |<----- picture? -----+
              captureVisibleTab(VS Code tab) -> crop to the lines around the cursor -> JPEG
```

Gemini Live reads streamed pictures at low resolution, so 15px code in a whole window is a blur. Two things fix that:

- **Text.** Gemini's web client asks its host for the shared tab's "annotated page content", the protobuf Gemini in Chrome reads pages through (`src/lib/page-content.ts`, schema from Chromium's `common_quality_data.proto`). The bridge answers with the tutor view that the trainer's VS Code extension serves (`apps/vscode-ext/src/tutorView.ts`), so Gemini gets the lesson, the numbered file and the test output as exact text.
- **Picture.** Each frame is cropped to the lines around the cursor (`src/lib/focus-rect.ts`), so the code is large.

The client only pulls a new picture and page content when the shared tab's id changes, so the bridge changes it once the view has changed and stayed still for a moment. Without the VS Code extension it falls back to a new id every second.

- `src/entrypoints/glic.content.ts` is the bridge. It plays the browser host the Gemini web client expects, so the client runs Live itself and asks the bridge for pictures.
- `src/entrypoints/glic-relay.content.ts` carries the bridge's reports to the worker and the worker's calls back.
- `src/lib/live.ts` is the worker: session states (opening, briefing, live, paused, reconnecting, failed), the brief, reconnects, and the picture of the VS Code tab (`src/lib/capture.ts`).
- The brief is typed into Gemini's text box with trusted key events through the `debugger` permission, because the box keeps Send disabled for anything else. It is the only text turn: the source project found that pausing Live for a second one leaves Live silent. Everything after it, including a new lesson, reaches Gemini as page content.
- Worker state lives in `storage.local` (not `storage.session`), is validated with zod on every read, and is reset when the browser starts or the extension is installed or updated (a development build keeps it across its own reloads).
- A paused Live (for example after a long silence) is resumed in the same conversation. Only Live breaking ("Something went wrong") is retried with Gemini's own Try again, then the Gemini window is reloaded and briefed again, up to three times in ten minutes.

## Tests

```
pnpm --filter @interview-prep/gemini-live compile     # wxt prepare + tsc
pnpm --filter @interview-prep/gemini-live test        # unit tests (title parsing, brief, message validation)
pnpm --filter @interview-prep/gemini-live test:chain  # the whole chain in a real browser
```

`test:chain` builds the extension for a throwaway origin, serves a fake VS Code there, launches Chrome for Testing (found in `~/.cache/puppeteer/chrome`, or set `CHROME_FOR_TESTING`) with a fresh profile, and answers every request to `gemini.google.com` with `test/glic.test.html`, a stand-in for the Gemini client. It then drives the popup and checks the whole path: the brief typed with trusted keys, Live, pictures that really show the page, no picture when VS Code is hidden or navigated away, a renamed tab, Live breaking and recovering, Stop, the Hebrew brief, a signed-out Gemini, and the VS Code tab closing. It stops only the browser it started, by pid.

## Limits, honestly

- **The real Gemini path is unverified.** Nothing here has run against a signed-in `gemini.google.com`. The tests use a stand-in that copies how the real client behaved in the source projects. Button labels, phrases and flag keys in `glic.content.ts` are Google's and can change; each is named once at the top of that file.
- **`<all_urls>` is requested.** Chrome only allows `captureVisibleTab` with `<all_urls>` or a live `activeTab` grant, and `activeTab` is lost whenever the tab reloads. The code only ever captures a tab whose address is the VS Code origin. The `debugger` permission is already broader than this.
- **Gemini sees whatever VS Code shows**, including anything you would rather not share. Nothing else is captured.
- **Only the visible tab can be captured.** If the VS Code tab is in the background or its window is minimized, Gemini gets no picture and the popup says so. Keep the Gemini window at least partly uncovered so Chrome does not treat it as hidden.
- **The lesson name comes from the tab title only.** The extension cannot read `.progress/progress.json` or `dist/index.json`. A non-file page (Welcome, Settings) is treated as "most likely the lesson", and the screenshot settles it.
- **Chrome shows its "is debugging this browser" bar** on the Gemini window for the few seconds the brief takes to type.
- **Typing the brief uses key events one by one.** About 1,300 characters took about a second in the stand-in; the real page may be slower.
- Chrome only. Changing the port means building with `VSCODE_ORIGIN=http://127.0.0.1:<port> pnpm build`.
- The Gemini window is placed at the top right of the VS Code window. If Chrome refuses that position (it must be at least half on a screen), it opens wherever Chrome puts it.
- Live may be refused by Google (sign-in, region, usage limits). The popup shows the reason it could see.
