import { buildBrief } from "../src/lib/brief.ts";
import { Language } from "../src/lib/language.ts";
import { parseSession } from "../src/lib/session-schema.ts";
import { oneLine } from "../src/lib/text.ts";
import { parseVscodeTitle } from "../src/lib/vscode-title.ts";
import { z } from "../src/lib/zod.ts";
import { type Cdp, connect } from "./cdp.ts";
/*
 * Gemini Live, the extension's half, in a real browser with the built extension loaded.
 *
 *   pnpm test:chain        (builds, serves a fake VS Code, launches Chrome for Testing, runs this)
 *
 * or by hand, with the extension built for that origin and loaded into a Chrome for Testing
 * started with --remote-debugging-port:
 *
 *   node test/livechain.ts <debug-port> <fake-vscode-origin>
 *
 * gemini.google.com is answered by this script, not by Google: every request to it is caught
 * at the browser and given glic.test.html, a stand-in that behaves like the real client where
 * the bridge depends on it. So this covers every hop that is OURS and none that is Google's:
 *
 *   popup button -> worker -> a Gemini window -> relay -> bridge -> the client adopts our host
 *   -> the brief typed with TRUSTED keys -> Live -> a picture a second, taken of the VS Code
 *   tab -> the shared tab renamed with the lesson -> VS Code hidden or navigated away: no
 *   picture -> Live breaks and the window is reloaded and briefed again -> stop, language,
 *   a refused sign-in, and the VS Code tab closing.
 *
 * What it cannot cover is Google's page itself: the login, and the thing that will one day
 * change. When that happens the bridge's vocabulary is named once at the top of
 * src/entrypoints/glic.content.ts.
 */
import { readFileSync } from "node:fs";

const [, , debugPort, vscodeOrigin] = process.argv;
if (!debugPort || !vscodeOrigin) {
  console.log("usage: node test/livechain.ts <debug-port> <fake-vscode-origin>");
  process.exit(2);
}

const EXTENSION_NAME = "Interview Prep: Gemini Live tutor";
const BASE = `http://127.0.0.1:${debugPort}`;
const GEMINI = "https://gemini.google.com/";
const GLIC = `${GEMINI}glic`;
const VSCODE_URL = `${vscodeOrigin}/?folder=%2Finterview-prep`;
const STAND_IN = readFileSync(new URL("./glic.test.html", import.meta.url), "utf8");
const UNAVAILABLE_PAGE = "<!doctype html><title>glic</title><p>Gemini isn't available right now</p>";
const FILE_TITLE = "● two_sum.py - interview-prep - Visual Studio Code";
const LESSON_TITLE = "Two Sum - interview-prep - Visual Studio Code";
const MAX_FRAME_WIDTH = 2200;
const MIN_FRAME_BYTES = 2000;
const COLOR_TOLERANCE = 70;
const MAGENTA = [255, 0, 255];
const GREEN = [0, 255, 0];
const LIVE_TIMEOUT_FLAG_COUNT = 4;
const BRIEF_TIMEOUT_MS = 120_000;
const BOOT_REPORT_MS = 17_000;

const targetSchema = z.object({
  id: z.string(),
  type: z.string(),
  url: z.string(),
  webSocketDebuggerUrl: z.string()
});
type Target = z.infer<typeof targetSchema>;
const createdTargetSchema = z.object({ targetId: z.string() });
const sharedTabSchema = z.object({
  title: z.string(),
  url: z.string()
});
const vscodeTabSchema = z.object({
  id: z.number(),
  windowId: z.number()
});
const consoleCallSchema = z.object({
  type: z.string(),
  args: z.array(
    z.object({
      value: z.unknown().optional(),
      description: z.string().optional()
    })
  )
});

function wait(delayMs: number) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}
async function targets() {
  const listed = z.array(z.unknown()).catch([]).parse(await (await fetch(`${BASE}/json/list`)).json());
  return listed.flatMap(item => {
    const parsed = targetSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
async function targetByUrl(prefix: string) {
  return (await targets()).find(target => target.url.startsWith(prefix));
}
async function isGeminiOpen() {
  return !!(await targetByUrl(GEMINI));
}
function isNear({ color, expected }: {
  color: number[];
  expected: number[];
}) {
  return expected.every((channel, i) => Math.abs(channel - (color[i] ?? Number.NEGATIVE_INFINITY)) < COLOR_TOLERANCE);
}
function expectedBrief(language: Language) {
  return oneLine(
    buildBrief({
      context: parseVscodeTitle(FILE_TITLE),
      language
    })
  );
}

let failures = 0;
function check({ name, ok, detail = "" }: {
  name: string;
  ok: boolean;
  detail?: string;
}) {
  if (!ok) {
    failures++;
  }

  console.log(`${ok ? "ok  " : "FAIL"}  ${name.padEnd(66)} ${detail}`.trimEnd());
}

async function until<T>({ get, timeoutMs = 30_000, every = 300 }: {
  get: () => Promise<T> | T;
  timeoutMs?: number;
  every?: number;
}) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const value = await get();
    if (value || Date.now() > end) {
      return value;
    }

    await wait(every);
  }
}

async function read<T>({ cdp, expression, schema, fallback }: {
  cdp: Cdp;
  expression: string;
  schema: z.ZodType<T>;
  fallback: T;
}) {
  const raw = await cdp.evaluate(`JSON.stringify(${expression})`).catch(() => null);
  if (typeof raw !== "string" || raw.startsWith("EXC")) {
    return fallback;
  }

  const parsed = schema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : fallback;
}

// ---- every gemini.google.com request is ours to answer ----
const version = await (await fetch(`${BASE}/json/version`)).json();
const browserCdp = await connect(version.webSocketDebuggerUrl);
await browserCdp.send("Fetch.enable", { patterns: [{ urlPattern: `${GEMINI}*` }] });
let geminiPage = STAND_IN;
let served = 0;
browserCdp.on(({ method, params }) => {
  if (method !== "Fetch.requestPaused") {
    return;
  }

  served++;
  void browserCdp.send("Fetch.fulfillRequest", {
    requestId: params.requestId,
    responseCode: 200,
    responseHeaders: [{
      name: "content-type",
      value: "text/html; charset=utf-8"
    }],
    body: Buffer.from(geminiPage, "utf8").toString("base64")
  });
});

// ---- the fake VS Code tab and the popup, each in a window of its own ----
const blank = (await targets()).find(target => target.type === "page" && target.url === "about:blank");
if (!blank) {
  console.log("no about:blank page target, start the browser as the header describes");
  process.exit(1);
}

const vscode = await connect(blank.webSocketDebuggerUrl);
await vscode.send("Page.enable");
await vscode.send("Runtime.enable");

async function isOurWorker(target: Target) {
  if (target.type !== "service_worker" || !target.url.startsWith("chrome-extension://")) {
    return false;
  }

  const worker = await connect(target.webSocketDebuggerUrl);
  const name = await worker.evaluate(`chrome.runtime.getManifest().name`).catch(() => null);
  worker.close();
  return name === EXTENSION_NAME;
}

async function findOurWorker() {
  for (const target of await targets()) {
    if (await isOurWorker(target)) {
      return target;
    }
  }
  return null;
}

const extensionTarget = await until({ get: findOurWorker });
check({
  name: "the extension is loaded",
  ok: !!extensionTarget,
  detail: extensionTarget?.url ?? "none"
});

if (!extensionTarget) {
  process.exit(1);
}

const extensionId = new URL(extensionTarget.url).host;
const worker = await connect(extensionTarget.webSocketDebuggerUrl);
worker.on(({ method, params }) => {
  if (method === "Runtime.exceptionThrown") {
    console.log("  worker threw:", JSON.stringify(params.exceptionDetails));
  }

  const consoleCall = consoleCallSchema.safeParse(params);
  if (method === "Runtime.consoleAPICalled" && consoleCall.success && consoleCall.data.type === "error") {
    console.log("  worker error:", consoleCall.data.args.map(arg => arg.value ?? arg.description).join(" "));
  }
});
await worker.send("Runtime.enable");

const created = createdTargetSchema.parse(
  await browserCdp.send("Target.createTarget", {
    url: `chrome-extension://${extensionId}/popup.html`,
    newWindow: true
  })
);
const popupTarget = await until({ get: async () => (await targets()).find(target => target.id === created.targetId) });
if (!popupTarget) {
  console.log("the popup page never opened");
  process.exit(1);
}

const popup = await connect(popupTarget.webSocketDebuggerUrl);
await popup.send("Runtime.enable");
await until({ get: () => popup.evaluate(`!!document.querySelector('#status')`) });
await popup.evaluate(
  `(() => {
  window.__states = [];
  const el = document.querySelector('#status');
  new MutationObserver(() => window.__states.push(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true });
  return 1; })()`
);

async function status() {
  return String((await popup.evaluate(`document.querySelector('#status').textContent`)) ?? "");
}
async function chip() {
  return String((await popup.evaluate(`document.querySelector('#chip').textContent`)) ?? "");
}
async function isStartEnabled() {
  return !(await popup.evaluate(`document.querySelector('#start').disabled`));
}
function statusIncludes(text: string) {
  return until({
    get: async () => ((await status()).includes(text) ? status() : null),
    timeoutMs: 15_000
  });
}
function everStatedIncluding(text: string) {
  return until({
    get: async () => (await read({
      schema: z.array(z.string()),
      cdp: popup,
      expression: "window.__states",
      fallback: []
    })).some(state => state.includes(text)),
    timeoutMs: 15_000
  });
}
function pressStart() {
  return popup.evaluate(`document.querySelector('#start').click()`);
}
function pressStop() {
  return popup.evaluate(`document.querySelector('#stop').click()`);
}
async function storedSession() {
  return parseSession(await popup.evaluate(`chrome.storage.local.get('session').then(row => row.session ?? null)`));
}
function isSessionCleared(timeoutMs: number) {
  return until({
    get: async () => (await storedSession()) === null,
    timeoutMs
  });
}
async function vscodeTabInfo() {
  return vscodeTabSchema.parse(await popup.evaluate(`chrome.tabs.query({ url: ${JSON.stringify(`${vscodeOrigin}/*`)} }).then(tabs => ({ id: tabs[0].id, windowId: tabs[0].windowId }))`));
}

async function attachGemini() {
  const target = await until({ get: () => targetByUrl(GLIC) });
  if (!target) {
    return null;
  }

  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send("Runtime.enable");
  return {
    target,
    cdp
  };
}
function logOf(cdp: Cdp) {
  return read({
    schema: z.array(z.string()),
    cdp,
    expression: "window.__log",
    fallback: []
  });
}
function promptsOf(cdp: Cdp) {
  return read({
    schema: z.array(z.string()),
    cdp,
    expression: "window.__prompts",
    fallback: []
  });
}
function framesOf(cdp: Cdp) {
  return read({
    schema: z.array(z.array(z.union([z.number(), z.string()])).nullable()),
    cdp,
    expression: "window.__frames",
    fallback: []
  });
}
function hasLived(cdp: Cdp) {
  return until({
    get: async () => (await logOf(cdp)).includes("mode:live"),
    timeoutMs: BRIEF_TIMEOUT_MS
  });
}
function firstPrompts(cdp: Cdp) {
  return until({
    async get() {
      const prompts = await promptsOf(cdp);
      return prompts.length ? prompts : null;
    },
    timeoutMs: BRIEF_TIMEOUT_MS
  });
}
function hasNewPicture({ cdp, since }: {
  cdp: Cdp;
  since: number;
}) {
  return until({
    get: async () => (await framesOf(cdp)).slice(since).some(Boolean),
    timeoutMs: 20_000
  });
}

await until({ get: async () => (await status()) !== "" });
check({
  name: "popup: no VS Code tab, so start is disabled",
  ok: !(await isStartEnabled()),
  detail: await status()
});
check({
  name: "popup: and it says to open VS Code",
  ok: (await status()).includes("Open VS Code")
});
await vscode.send("Page.navigate", { url: VSCODE_URL });
check({
  name: "popup: a VS Code tab appears, start enables by itself",
  ok: !!(await until({
    get: isStartEnabled,
    timeoutMs: 15_000
  })),
  detail: await status()
});

// ---- session one: English, a file open ----
const viewportWidth = Number(await vscode.evaluate(`Math.round(innerWidth * devicePixelRatio)`));
const pressedAt = Date.now();
await pressStart();
const first = await attachGemini();
check({
  name: "the worker opened a Gemini window",
  ok: !!first,
  detail: first?.target.url ?? "none"
});

if (!first) {
  console.log("  popup:", await status(), "|", await popup.evaluate(`document.querySelector('#note').textContent`));
  for (const target of await targets()) {
    console.log("  target:", target.type, target.url);
  }
  process.exit(1);
}

const { cdp: glic } = first;

check({
  name: "the client adopted our host",
  ok: !!(await until({ get: async () => (await logOf(glic)).includes("init") }))
});
const prompts = await firstPrompts(glic);
const brief = prompts?.[0] ?? "";
check({
  name: "the brief was typed with trusted keys and sent",
  ok: !!brief,
  detail: prompts ? `${brief.length} chars, ${((Date.now() - pressedAt) / 1000).toFixed(1)}s from the button` : "nothing submitted"
});
check({
  name: "...and is exactly the brief built for this tab and language",
  ok: brief === expectedBrief(Language.ENGLISH)
});
check({
  name: "...naming the open file",
  ok: brief.includes("the file \"two_sum.py\"")
});
check({
  name: "...with the coaching rules (Socratic, why, early returns)",
  ok: ["Socratic", "WHY", "early returns", "magic numbers"].every(word => brief.includes(word))
});
check({
  name: "...on one line, so Enter could not send it early",
  ok: !!brief && !brief.includes("\n")
});

check({
  name: "then Live",
  ok: !!(await hasLived(glic))
});
const flagCount = await glic.evaluate(`Object.values(window.default_BardChatUi).filter((flag) => flag.defaultValue === 86400 || flag.defaultValue === 86400000).length`);
check({
  name: "Live's four timeouts were rewritten first",
  ok: flagCount === LIVE_TIMEOUT_FLAG_COUNT,
  detail: `${flagCount} of ${LIVE_TIMEOUT_FLAG_COUNT}`
});

const pictures = await until({
  get: async () => ((await framesOf(glic)).filter(Boolean).length >= 2 ? framesOf(glic) : null),
  timeoutMs: 25_000
});
const shot = pictures?.find(Boolean);
const expectedWidth = Math.min(MAX_FRAME_WIDTH, viewportWidth);
check({
  name: "Gemini is handed a picture a second, downscaled to the cap",
  ok: !!shot && shot[0] === expectedWidth && shot[3] === "image/jpeg" && Number(shot[2]) > MIN_FRAME_BYTES,
  detail: shot ? `${shot[0]}x${shot[1]} ${shot[3]}, ${Math.round(Number(shot[2]) / 1024)} KB (viewport ${viewportWidth}px)` : "none"
});
const probe = (await read({
  schema: z.array(
    z.object({
      topLeft: z.array(z.number()),
      bottomRight: z.array(z.number())
    })
  ),
  cdp: glic,
  expression: "window.__probes",
  fallback: []
}))[0];
check({
  name: "...and it shows the VS Code tab (magenta bar, green corner)",
  ok: !!probe && isNear({
    color: probe.topLeft,
    expected: MAGENTA
  }) && isNear({
    color: probe.bottomRight,
    expected: GREEN
  }),
  detail: JSON.stringify(probe)
});
const tabData = await read({
  schema: sharedTabSchema.nullable(),
  cdp: glic,
  expression: "window.__tab",
  fallback: null
});
check({
  name: "the shared tab carries the VS Code title and address",
  ok: tabData?.title === FILE_TITLE && tabData.url === vscodeOrigin,
  detail: tabData?.title ?? ""
});

check({
  name: "popup: says Gemini is watching with the mic muted",
  ok: !!(await statusIncludes("mic muted")),
  detail: `${await chip()} / ${await status()}`
});
const stateLog = String(await popup.evaluate(`JSON.stringify(window.__states)`));
const order = ["Opening", "Briefing", "mic muted"].map(word => stateLog.indexOf(word));
check({
  name: "popup: went through opening, briefing, live in order",
  ok: order.every(position => position >= 0) && (order[0] ?? 0) < (order[1] ?? 0) && (order[1] ?? 0) < (order[2] ?? 0)
});
const stored = await storedSession();
check({
  name: "worker state lives in storage.local",
  ok: stored?.state === "live" && stored.sight === "seeing",
  detail: stored ? `${stored.state}/${stored.sight}` : "no row"
});

// ---- the chip's mic button unmutes, and pressing it again mutes ----
function pressMicButton() {
  return vscode.evaluate(`document.querySelector(".ip-tutor-mic").click()`);
}
await until({
  get: () => vscode.evaluate(`!!document.querySelector(".ip-tutor-mic")`),
  timeoutMs: 60_000
});
await pressMicButton();
check({
  name: "the mic button unmutes: popup says listening and watching",
  ok: !!(await statusIncludes("listening and watching")),
  detail: await status()
});
check({
  name: "...and the session keeps it",
  ok: (await storedSession())?.isMicOpen === true
});
await pressMicButton();
check({
  name: "pressed again: muted",
  ok: !!(await statusIncludes("mic muted")) && (await storedSession())?.isMicOpen === false
});
await pressMicButton();

async function wasPaused() {
  const entries = await logOf(glic);
  return entries.slice(entries.indexOf("mode:live")).includes("mode:text");
}

// ---- the lesson changes: the tab is renamed, Live is left alone ----
await vscode.evaluate(`document.title = ${JSON.stringify(LESSON_TITLE)}`);
const renamed = await until({
  get: async () => ((await read({
    schema: sharedTabSchema.nullable(),
    cdp: glic,
    expression: "window.__tab",
    fallback: null
  }))?.title === LESSON_TITLE),
  timeoutMs: 15_000
});
check({
  name: "a new tab title renames the shared tab",
  ok: !!renamed
});
await wait(4000);
check({
  name: "...without typing another brief",
  ok: (await promptsOf(glic)).length === 1
});
check({
  name: "...so Live was never paused for it",
  ok: !(await wasPaused())
});

// ---- VS Code behind another tab: no picture ----
const vscodeTab = await vscodeTabInfo();
let seen = (await framesOf(glic)).length;
await popup.evaluate(`chrome.tabs.create({ windowId: ${vscodeTab.windowId}, url: 'about:blank', active: true }).then(tab => tab.id)`);
await wait(3500);
let late = (await framesOf(glic)).slice(seen + 1);
check({
  name: "another tab in front: Gemini gets no picture of it",
  ok: late.length >= 1 && late.every(frame => frame === null),
  detail: `${late.length} calls, all empty`
});
check({
  name: "popup: says Gemini cannot see VS Code",
  ok: !!(await statusIncludes("cannot see VS Code")),
  detail: await status()
});
await popup.evaluate(`chrome.tabs.update(${vscodeTab.id}, { active: true })`);
seen = (await framesOf(glic)).length;
check({
  name: "VS Code back in front: pictures resume",
  ok: !!(await hasNewPicture({
    cdp: glic,
    since: seen
  }))
});
check({
  name: "popup: back to listening and watching",
  ok: !!(await statusIncludes("listening and watching"))
});

// ---- the tab goes somewhere else: never a picture of it ----
seen = (await framesOf(glic)).length;
await vscode.send("Page.navigate", { url: "about:blank" });
await wait(3500);
late = (await framesOf(glic)).slice(seen + 1);
check({
  name: "tab navigated away from VS Code: no picture of the new page",
  ok: late.length >= 1 && late.every(frame => frame === null),
  detail: `${late.length} calls, all empty`
});
await vscode.send("Page.navigate", { url: VSCODE_URL });
seen = (await framesOf(glic)).length;
check({
  name: "navigated back: pictures resume",
  ok: !!(await hasNewPicture({
    cdp: glic,
    since: seen
  }))
});
check({
  name: "...and the session was not ended by any of it",
  ok: (await storedSession())?.state === "live"
});

// ---- Live breaks mid-session: "Something went wrong", and Try again does not help ----
await glic.evaluate(`window.__break(), 1`);
check({
  name: "Live broken: its own Try again is tried first",
  ok: !!(await until({
    get: async () => (await logOf(glic)).includes("try-again"),
    timeoutMs: 12_000
  }))
});
check({
  name: "...and when that does not bring it back, the popup says reconnecting",
  ok: !!(await everStatedIncluding("reconnecting"))
});
const rebriefed = await until({
  async get() {
    const entries = await logOf(glic);
    const sent = await promptsOf(glic);
    return entries.includes("mode:live") && !entries.includes("try-again") && sent.length === 1 ? sent : null;
  },
  timeoutMs: 90_000,
  every: 1000
});
check({
  name: "the window is reloaded, briefed again as a new conversation, back in Live",
  ok: rebriefed?.[0] === expectedBrief(Language.ENGLISH)
});
check({
  name: "popup: listening and watching again",
  ok: !!(await statusIncludes("listening and watching"))
});
seen = 0;
check({
  name: "and Gemini sees VS Code again",
  ok: !!(await hasNewPicture({
    cdp: glic,
    since: seen
  }))
});

// ---- stop ----
await pressStop();
check({
  name: "stop closes the Gemini window",
  ok: !!(await until({
    get: async () => !(await isGeminiOpen()),
    timeoutMs: 10_000
  }))
});
check({
  name: "...and clears the stored session",
  ok: !!(await isSessionCleared(5000))
});
check({
  name: "popup: back to a start button",
  ok: !!(await until({
    get: isStartEnabled,
    timeoutMs: 5000
  }))
});
glic.close();

// ---- language: Hebrew, chosen in the popup ----
await popup.evaluate(`(() => { const select = document.querySelector('#language'); select.value = 'he'; select.dispatchEvent(new Event('change', { bubbles: true })); return select.value; })()`);
const isHebrewStored = await until({
  get: async () => (await popup.evaluate(`chrome.storage.local.get('language').then(row => row.language ?? null)`)) === "he",
  timeoutMs: 5000
});
check({
  name: "language: Hebrew is stored because it was chosen",
  ok: !!isHebrewStored
});
await pressStart();
const hebrew = await attachGemini();
const hebrewPrompts = hebrew ? await firstPrompts(hebrew.cdp) : null;
check({
  name: "language: the next brief asks for spoken Hebrew",
  ok: hebrewPrompts?.[0] === expectedBrief(Language.HEBREW) && !!hebrewPrompts[0]?.includes("natural spoken Hebrew")
});
check({
  name: "...and went Live",
  ok: !!hebrew && !!(await hasLived(hebrew.cdp))
});

// ---- the person closes the Gemini window by hand ----
hebrew?.cdp.close();

if (hebrew) {
  await browserCdp.send("Target.closeTarget", { targetId: hebrew.target.id });
}

check({
  name: "closing the Gemini window ends the session",
  ok: !!(await isSessionCleared(10_000))
});
check({
  name: "popup: back to a start button",
  ok: !!(await until({
    get: isStartEnabled,
    timeoutMs: 5000
  }))
});

// ---- a Gemini that is not signed in ----
geminiPage = UNAVAILABLE_PAGE;
await pressStart();
const signIn = await statusIncludes("Sign in to Google");
check({
  name: "a signed-out Gemini: the popup says to sign in",
  ok: !!signIn,
  detail: signIn ?? (await status())
});
check({
  name: "...the session is marked failed, and start is offered again",
  ok: (await chip()) === "failed" && (await isStartEnabled())
});
await wait(BOOT_REPORT_MS);
check({
  name: "...and the sign-in message is not overwritten later",
  ok: (await status()).includes("Sign in to Google"),
  detail: await status()
});
await pressStop();
check({
  name: "stop clears the failed session and closes its window",
  ok: !!(await until({
    get: async () => !(await isGeminiOpen()) && (await storedSession()) === null,
    timeoutMs: 10_000
  }))
});
geminiPage = STAND_IN;

// ---- the VS Code tab closes: so does the session ----
await pressStart();
const last = await attachGemini();
check({
  name: "a fresh session goes Live",
  ok: !!last && !!(await hasLived(last.cdp))
});
last?.cdp.close();
await popup.evaluate(`chrome.tabs.remove(${vscodeTab.id})`);
check({
  name: "closing the VS Code tab closes the Gemini window",
  ok: !!(await until({
    get: async () => !(await isGeminiOpen()),
    timeoutMs: 10_000
  }))
});
check({
  name: "...and ends the session",
  ok: !!(await isSessionCleared(5000))
});
check({
  name: "popup: asks for VS Code again",
  ok: !!(await until({
    get: async () => (await status()).includes("Open VS Code"),
    timeoutMs: 5000
  }))
});

console.log(`\n(${served} requests to gemini.google.com answered here)`);
console.log(failures ? `${failures} FAILED` : "the Live chain holds end to end");
process.exit(failures ? 1 : 0);
