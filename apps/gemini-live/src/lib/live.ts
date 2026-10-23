import { bridgeFailureSchema, glicStateSchema } from "./bridge-report.ts";
import {
  BridgeFailure,
  GLIC_URL,
  GlicCommand,
  GlicReport,
  GlicState
} from "./bridge-vocab.ts";
import { buildBrief } from "./brief.ts";
import { captureVscode } from "./capture.ts";
import { ExtensionMessage, extensionMessenger, type StartResult } from "./extension-channel.ts";
import { fetchTutorView } from "./fetch-tutor-view.ts";
import { isRunning, LiveState, Sight } from "./live-state.ts";
import { listenToMicKey } from "./mic-key.ts";
import type { Session } from "./session-schema.ts";
import { clearSession, loadSession, saveSession, updateSession } from "./session.ts";
import { loadLanguage } from "./settings.ts";
import { typeText } from "./typing.ts";
import { parseVscodeTitle } from "./vscode-title.ts";
import { findVscodeTab, isVscodeUrl, VSCODE_ORIGIN } from "./vscode.ts";
import { within } from "./within.ts";
import { browser } from "wxt/browser";

const MAX_RESTARTS = 3;
const RESTART_WINDOW_MS = 10 * 60_000;
const CALL_TIMEOUT_MS = 60_000;
const GLIC_WINDOW_SIZE = {
  width: 420,
  height: 720
};
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

function refused(detail: string): StartResult {
  return {
    isStarted: false,
    detail
  };
}

function tell({ state, detail = "" }: {
  state: LiveState;
  detail?: string;
}) {
  return updateSession({
    state,
    detail
  });
}

function command({ session, name }: {
  session: Session;
  name: GlicCommand;
}) {
  return within({
    timeoutMs: CALL_TIMEOUT_MS,
    promise: extensionMessenger.sendMessage(name, undefined, session.glicTab),
    fallback: null
  });
}

function sendMic(session: Session) {
  return within({
    timeoutMs: CALL_TIMEOUT_MS,
    promise: extensionMessenger.sendMessage(GlicCommand.SET_MIC, session.isMicOpen, session.glicTab),
    fallback: null
  });
}

async function toggleMic() {
  const session = await loadSession();
  if (!session || !isRunning(session.state)) {
    return;
  }

  const next = await updateSession({ isMicOpen: !session.isMicOpen });
  if (next) {
    await sendMic(next);
  }
}

function closeWindow(windowId: number) {
  return browser.windows.remove(windowId).catch(() => {});
}

let hasBorrowedFocus = false;

function focusWindow(windowId: number) {
  return browser.windows.update(windowId, { focused: true }).catch(() => {});
}

async function borrowFocus(session: Session) {
  hasBorrowedFocus = true;
  await focusWindow(session.glicWindow);
}

async function returnFocus(session: Session) {
  if (!hasBorrowedFocus) {
    return;
  }

  hasBorrowedFocus = false;
  const vscodeTab = await browser.tabs.get(session.vscodeTab).catch(() => null);
  if (vscodeTab) {
    await focusWindow(vscodeTab.windowId);
  }
}

async function briefTutor() {
  const session = await loadSession();
  if (!session?.brief || !session.isBooted) {
    return;
  }

  await updateSession({
    brief: "",
    state: LiveState.BRIEFING,
    detail: ""
  });
  const isTextBoxReady = await command({
    session,
    name: GlicCommand.BEGIN_TEXT
  });
  if (!isTextBoxReady) {
    return tell({
      state: LiveState.FAILED,
      detail: Text.NO_TEXT_BOX
    });
  }

  try {
    await typeText({
      tabId: session.glicTab,
      text: session.brief
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return tell({
      state: LiveState.FAILED,
      detail: `${Text.TYPING_FAILED}: ${reason}`
    });
  }
  await command({
    session,
    name: GlicCommand.SUBMIT
  });
  await borrowFocus(session);
  await command({
    session,
    name: GlicCommand.START_LIVE
  });
}

async function restart(session: Session) {
  const now = Date.now();
  const restarts = session.restarts.filter(restartedAt => now - restartedAt < RESTART_WINDOW_MS);
  if (restarts.length >= MAX_RESTARTS) {
    await updateSession({
      restarts,
      state: LiveState.FAILED,
      detail: Text.KEEPS_DROPPING
    });
    return;
  }

  await updateSession({
    restarts: [...restarts, now],
    state: LiveState.RECONNECTING,
    detail: ""
  });
  await browser.tabs.reload(session.glicTab).catch(() => {});
}

async function fail({ session, failure }: {
  session: Session;
  failure: BridgeFailure;
}) {
  if (failure === BridgeFailure.LIVE_BROKE) {
    return restart(session);
  }

  if (SIGN_IN_FAILURES.has(failure)) {
    await browser.windows.update(session.glicWindow, { focused: true }).catch(() => {});
  }

  await tell({
    state: LiveState.FAILED,
    detail: FAILURE_TEXT[failure]
  });
}

async function onBooted(session: Session) {
  await updateSession({ isBooted: true });
  void (session.brief ? briefTutor() : borrowFocus(session).then(() => command({
    session,
    name: GlicCommand.START_LIVE
  })));
}

async function onReady(session: Session) {
  await tell({ state: LiveState.LIVE });
  await sendMic(session);
  await returnFocus(session);
}

async function onState({ session, state }: {
  session: Session;
  state: GlicState;
}) {
  if (session.state === LiveState.BRIEFING) {
    return;
  }

  if (state === GlicState.LISTENING) {
    await tell({ state: LiveState.LIVE });
    return returnFocus(session);
  }

  if (state === GlicState.RESUMING) {
    await borrowFocus(session);
    return tell({ state: LiveState.PAUSED });
  }
}

async function glicSession(tab: { id?: number } | undefined) {
  const session = await loadSession();
  return session && tab?.id !== undefined && session.glicTab === tab.id ? session : null;
}

async function geminiWindowPosition(windowId: number) {
  const vscodeWindow = await browser.windows.get(windowId).catch(() => null);
  const { left, top, width } = vscodeWindow ?? {};
  if (left === undefined || top === undefined || width === undefined) {
    return {};
  }

  return {
    left: Math.max(left, left + width - GLIC_WINDOW_SIZE.width - WINDOW_MARGIN),
    top: top + WINDOW_TOP_OFFSET
  };
}

async function createGeminiWindow(vscodeWindowId: number) {
  const options = {
    url: GLIC_URL,
    type: "popup",
    ...GLIC_WINDOW_SIZE,
    focused: true
  } as const;
  const positioned = await browser.windows.create({
    ...options,
    ...(await geminiWindowPosition(vscodeWindowId))
  }).catch(() => null);
  return positioned ?? browser.windows.create(options);
}

async function openSession(): Promise<StartResult> {
  const vscodeTab = await findVscodeTab();
  if (vscodeTab?.id === undefined) {
    return refused(Text.NO_VSCODE_TAB);
  }

  const title = vscodeTab.title ?? "";
  const brief = buildBrief({
    context: parseVscodeTitle(title),
    language: await loadLanguage()
  });
  const geminiWindow = await createGeminiWindow(vscodeTab.windowId);
  const glicTab = geminiWindow?.tabs?.[0]?.id;
  if (geminiWindow?.id === undefined || glicTab === undefined) {
    return refused(Text.WINDOW_FAILED);
  }

  await saveSession({
    vscodeTab: vscodeTab.id,
    glicTab,
    glicWindow: geminiWindow.id,
    title,
    brief,
    briefing: brief,
    restarts: [],
    isBooted: false,
    isMicOpen: false,
    state: LiveState.OPENING,
    detail: "",
    sight: Sight.UNKNOWN,
    frames: 0
  });
  return {
    isStarted: true,
    detail: ""
  };
}

async function startSession(): Promise<StartResult> {
  if (isStarting) {
    return refused(Text.ALREADY_STARTING);
  }

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
}

async function stopSession() {
  const session = await loadSession();
  if (!session) {
    return;
  }

  await command({
    session,
    name: GlicCommand.STOP_LIVE
  });
  await clearSession();
  await closeWindow(session.glicWindow);
}

async function resetSession() {
  const session = await loadSession();
  if (!session) {
    return;
  }

  await clearSession();
  await closeWindow(session.glicWindow);
}

async function retitle({ tabId, title }: {
  tabId: number;
  title: string;
}) {
  const session = await loadSession();
  if (session?.vscodeTab !== tabId) {
    return;
  }

  await updateSession({ title });
  await extensionMessenger.sendMessage(ExtensionMessage.GLIC_RETITLE, {
    title,
    url: VSCODE_ORIGIN
  }, session.glicTab).catch(() => {});
}

export function installLive() {
  extensionMessenger.onMessage(ExtensionMessage.LIVE_START, startSession);
  extensionMessenger.onMessage(ExtensionMessage.LIVE_STOP, stopSession);
  extensionMessenger.onMessage(ExtensionMessage.MIC_TOGGLE, toggleMic);
  listenToMicKey(() => void toggleMic());

  extensionMessenger.onMessage(ExtensionMessage.GLIC_HELLO, async ({ sender }) => {
    const session = await glicSession(sender.tab);
    if (!session) {
      return {
        isMine: false,
        title: "",
        url: ""
      };
    }

    await updateSession({
      isBooted: false,
      brief: session.briefing
    });
    return {
      isMine: true,
      title: session.title,
      url: VSCODE_ORIGIN
    };
  });

  extensionMessenger.onMessage(ExtensionMessage.GLIC_CAPTURE, async ({ sender }) => {
    const session = await glicSession(sender.tab);
    if (!session) {
      return null;
    }

    const { sight, frame } = await captureVscode(session.vscodeTab);
    await updateSession({
      sight,
      frames: session.frames + (frame ? 1 : 0)
    });
    return frame;
  });

  extensionMessenger.onMessage(ExtensionMessage.GLIC_TUTOR_VIEW, async ({ sender }) => {
    const session = await glicSession(sender.tab);
    return session ? fetchTutorView() : null;
  });

  extensionMessenger.onMessage(GlicReport.BOOTED, async ({ sender }) => {
    const session = await glicSession(sender.tab);
    if (session) {
      await onBooted(session);
    }
  });

  extensionMessenger.onMessage(GlicReport.READY, async ({ sender }) => {
    const session = await glicSession(sender.tab);
    if (session) {
      await onReady(session);
    }
  });

  extensionMessenger.onMessage(GlicReport.STATE, async ({ data, sender }) => {
    const state = glicStateSchema.safeParse(data);
    const session = state.success ? await glicSession(sender.tab) : null;
    if (session && state.success) {
      await onState({
        session,
        state: state.data
      });
    }
  });

  extensionMessenger.onMessage(GlicReport.FAILED, async ({ data, sender }) => {
    const failure = bridgeFailureSchema.safeParse(data);
    const session = failure.success ? await glicSession(sender.tab) : null;
    if (session && failure.success) {
      await fail({
        session,
        failure: failure.data
      });
    }
  });

  browser.windows.onRemoved.addListener(async windowId => {
    const session = await loadSession();
    if (session?.glicWindow === windowId) {
      await clearSession();
    }
  });

  browser.tabs.onRemoved.addListener(async tabId => {
    const session = await loadSession();
    if (session?.vscodeTab === tabId) {
      await stopSession();
    }
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const { title } = changeInfo;
    if (title !== undefined && isVscodeUrl(tab.url)) {
      void retitle({
        tabId,
        title
      });
    }
  });

  browser.runtime.onStartup.addListener(resetSession);
  browser.runtime.onInstalled.addListener(resetSession);
}
