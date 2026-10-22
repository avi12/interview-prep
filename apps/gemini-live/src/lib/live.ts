import { browser } from "wxt/browser";
import { buildBrief } from "./brief.ts";
import { bridgeReportSchema, type BridgeReport } from "./bridge-report.ts";
import { BridgeCall, BridgeFailure, BridgeUp, GLIC_URL, GlicState } from "./bridge-vocab.ts";
import { captureVscode } from "./capture.ts";
import { ExtensionMessage, extensionMessenger, type StartResult } from "./extension-channel.ts";
import { LiveState, Sight } from "./live-state.ts";
import { clearSession, loadSession, saveSession, updateSession, type Session } from "./session.ts";
import { loadLanguage } from "./settings.ts";
import { typeText } from "./typing.ts";
import { findVscodeTab, isVscodeUrl, VSCODE_ORIGIN } from "./vscode.ts";
import { parseVscodeTitle } from "./vscode-title.ts";
import { within } from "./within.ts";

const MAX_RESTARTS = 3;
const RESTART_WINDOW_MS = 10 * 60_000;
const CALL_TIMEOUT_MS = 60_000;
const GLIC_WINDOW_SIZE = { width: 420, height: 720 };
const WINDOW_MARGIN = 16;
const WINDOW_TOP_OFFSET = 80;

const Text = {
  NO_VSCODE_TAB: `Open VS Code in this browser first (${VSCODE_ORIGIN}), then press start`,
  WINDOW_FAILED: "Chrome would not open the Gemini window",
  ALREADY_STARTING: "Already starting a session",
  SIGN_IN: "Sign in to Google in the Gemini window, then press start again",
  PAGE_DID_NOT_START: "The Gemini page did not start, try again in a moment",
  LIVE_DID_NOT_START: "Gemini Live did not start (sign in, or you hit a usage limit)",
  LIVE_BROKE: "Gemini Live stopped working",
  NO_TEXT_BOX: "Could not find Gemini's text box",
  TYPING_FAILED: "Could not type the brief into Gemini",
  KEEPS_DROPPING: "Gemini keeps dropping, close its window and start again"
} as const;

const FAILURE_TEXT: Record<BridgeFailure, string> = {
  [BridgeFailure.SIGNED_OUT]: Text.SIGN_IN,
  [BridgeFailure.UNAVAILABLE]: Text.SIGN_IN,
  [BridgeFailure.PAGE_DID_NOT_START]: Text.PAGE_DID_NOT_START,
  [BridgeFailure.LIVE_DID_NOT_START]: Text.LIVE_DID_NOT_START,
  [BridgeFailure.LIVE_BROKE]: Text.LIVE_BROKE
};

const SIGN_IN_FAILURES: ReadonlySet<BridgeFailure> = new Set([BridgeFailure.SIGNED_OUT, BridgeFailure.UNAVAILABLE]);

let isStarting = false;

const refused = (detail: string): StartResult => ({ isStarted: false, detail });

const tell = ({ state, detail = "" }: { state: LiveState; detail?: string }) => updateSession({ state, detail });

const call = <T>({ session, name }: { session: Session; name: BridgeCall }) =>
  within({
    ms: CALL_TIMEOUT_MS,
    promise: extensionMessenger.sendMessage(ExtensionMessage.GLIC_CALL, { name }, session.glicTab),
    fallback: null
  }) as Promise<T | null>;

const closeWindow = (windowId: number) => browser.windows.remove(windowId).catch(() => {});

let hasBorrowedFocus = false;

const focusWindow = (windowId: number) => browser.windows.update(windowId, { focused: true }).catch(() => {});

const borrowFocus = async (session: Session) => {
  hasBorrowedFocus = true;
  await focusWindow(session.glicWindow);
};

const returnFocus = async (session: Session) => {
  if (!hasBorrowedFocus) return;
  hasBorrowedFocus = false;
  const vscodeTab = await browser.tabs.get(session.vscodeTab).catch(() => null);
  if (vscodeTab) await focusWindow(vscodeTab.windowId);
};

const briefTutor = async () => {
  const session = await loadSession();
  if (!session?.brief || !session.isBooted) return;
  await updateSession({ brief: "", state: LiveState.BRIEFING, detail: "" });
  const isTextBoxReady = await call<boolean>({ session, name: BridgeCall.BEGIN_TEXT });
  if (!isTextBoxReady) return tell({ state: LiveState.FAILED, detail: Text.NO_TEXT_BOX });
  try {
    await typeText({ tabId: session.glicTab, text: session.brief });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return tell({ state: LiveState.FAILED, detail: `${Text.TYPING_FAILED}: ${reason}` });
  }
  await call({ session, name: BridgeCall.SUBMIT });
  await borrowFocus(session);
  await call({ session, name: BridgeCall.START });
};

const restart = async (session: Session) => {
  const now = Date.now();
  const restarts = session.restarts.filter(at => now - at < RESTART_WINDOW_MS);
  if (restarts.length >= MAX_RESTARTS) {
    await updateSession({ restarts, state: LiveState.FAILED, detail: Text.KEEPS_DROPPING });
    return;
  }
  await updateSession({ restarts: [...restarts, now], state: LiveState.RECONNECTING, detail: "" });
  await browser.tabs.reload(session.glicTab).catch(() => {});
};

const fail = async ({ session, failure }: { session: Session; failure: BridgeFailure }) => {
  if (failure === BridgeFailure.LIVE_BROKE) return restart(session);
  if (SIGN_IN_FAILURES.has(failure)) await browser.windows.update(session.glicWindow, { focused: true }).catch(() => {});
  await tell({ state: LiveState.FAILED, detail: FAILURE_TEXT[failure] });
};

const fromBridge = async ({ session, report }: { session: Session; report: BridgeReport }) => {
  if (report.kind === BridgeUp.BOOTED) {
    await updateSession({ isBooted: true });
    void (session.brief ? briefTutor() : borrowFocus(session).then(() => call({ session, name: BridgeCall.START })));
    return;
  }
  if (report.kind === BridgeUp.READY) {
    await tell({ state: LiveState.LIVE });
    return returnFocus(session);
  }
  if (report.kind === BridgeUp.ERROR) return fail({ session, failure: report.failure });
  if (session.state === LiveState.BRIEFING) return;
  if (report.state === GlicState.LISTENING) {
    await tell({ state: LiveState.LIVE });
    return returnFocus(session);
  }
  if (report.state === GlicState.RESUMING) {
    await borrowFocus(session);
    return tell({ state: LiveState.PAUSED });
  }
};

const glicSession = async (tab: { id?: number } | undefined) => {
  const session = await loadSession();
  return session && tab?.id !== undefined && session.glicTab === tab.id ? session : null;
};

const geminiWindowPosition = async (windowId: number) => {
  const vscodeWindow = await browser.windows.get(windowId).catch(() => null);
  const { left, top, width } = vscodeWindow ?? {};
  if (left === undefined || top === undefined || width === undefined) return {};
  return { left: Math.max(left, left + width - GLIC_WINDOW_SIZE.width - WINDOW_MARGIN), top: top + WINDOW_TOP_OFFSET };
};

const createGeminiWindow = async (vscodeWindowId: number) => {
  const options = { url: GLIC_URL, type: "popup", ...GLIC_WINDOW_SIZE, focused: true } as const;
  const positioned = await browser.windows.create({ ...options, ...(await geminiWindowPosition(vscodeWindowId)) }).catch(() => null);
  return positioned ?? browser.windows.create(options);
};

const openSession = async (): Promise<StartResult> => {
  const vscodeTab = await findVscodeTab();
  if (vscodeTab?.id === undefined) return refused(Text.NO_VSCODE_TAB);
  const title = vscodeTab.title ?? "";
  const brief = buildBrief({ context: parseVscodeTitle(title), language: await loadLanguage() });
  const geminiWindow = await createGeminiWindow(vscodeTab.windowId);
  const glicTab = geminiWindow?.tabs?.[0]?.id;
  if (geminiWindow?.id === undefined || glicTab === undefined) return refused(Text.WINDOW_FAILED);
  await saveSession({
    vscodeTab: vscodeTab.id,
    glicTab,
    glicWindow: geminiWindow.id,
    title,
    brief,
    briefing: brief,
    restarts: [],
    isBooted: false,
    state: LiveState.OPENING,
    detail: "",
    sight: Sight.UNKNOWN,
    frames: 0
  });
  return { isStarted: true, detail: "" };
};

const startSession = async (): Promise<StartResult> => {
  if (isStarting) return refused(Text.ALREADY_STARTING);
  isStarting = true;
  try {
    const previous = await loadSession();
    if (previous) {
      await clearSession();
      await closeWindow(previous.glicWindow);
    }
    return await openSession();
  } finally {
    isStarting = false;
  }
};

const stopSession = async () => {
  const session = await loadSession();
  if (!session) return;
  await call({ session, name: BridgeCall.STOP });
  await clearSession();
  await closeWindow(session.glicWindow);
};

const resetSession = async () => {
  const session = await loadSession();
  if (!session) return;
  await clearSession();
  await closeWindow(session.glicWindow);
};

const retitle = async ({ tabId, title }: { tabId: number; title: string }) => {
  const session = await loadSession();
  if (session?.vscodeTab !== tabId) return;
  await updateSession({ title });
  await extensionMessenger.sendMessage(ExtensionMessage.GLIC_RETITLE, { title, url: VSCODE_ORIGIN }, session.glicTab).catch(() => {});
};

export const installLive = () => {
  extensionMessenger.onMessage(ExtensionMessage.LIVE_START, startSession);
  extensionMessenger.onMessage(ExtensionMessage.LIVE_STOP, stopSession);

  extensionMessenger.onMessage(ExtensionMessage.GLIC_HELLO, async ({ sender }) => {
    const session = await glicSession(sender.tab);
    if (!session) return { isMine: false, title: "", url: "" };
    await updateSession({ isBooted: false, brief: session.briefing });
    return { isMine: true, title: session.title, url: VSCODE_ORIGIN };
  });

  extensionMessenger.onMessage(ExtensionMessage.GLIC_CAPTURE, async ({ sender }) => {
    const session = await glicSession(sender.tab);
    if (!session) return null;
    const { sight, frame } = await captureVscode(session.vscodeTab);
    await updateSession({ sight, frames: session.frames + (frame ? 1 : 0) });
    return frame;
  });

  extensionMessenger.onMessage(ExtensionMessage.GLIC_REPORT, async ({ data, sender }) => {
    const parsedReport = bridgeReportSchema.safeParse(data);
    if (!parsedReport.success) return;
    const session = await glicSession(sender.tab);
    if (session) await fromBridge({ session, report: parsedReport.data });
  });

  browser.windows.onRemoved.addListener(async windowId => {
    const session = await loadSession();
    if (session?.glicWindow === windowId) await clearSession();
  });

  browser.tabs.onRemoved.addListener(async tabId => {
    const session = await loadSession();
    if (session?.vscodeTab === tabId) await stopSession();
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const { title } = changeInfo;
    if (title !== undefined && isVscodeUrl(tab.url)) void retitle({ tabId, title });
  });

  browser.runtime.onStartup.addListener(resetSession);
  browser.runtime.onInstalled.addListener(resetSession);
};
