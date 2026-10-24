import { bridgeFailureSchema, glicStateSchema } from "./bridge-report.ts";
import {
  BridgeFailure,
  GLIC_URL,
  GlicCommand,
  GlicReport,
  GlicState
} from "./bridge-vocab.ts";
import { buildBrief } from "./brief.ts";
import { Engine } from "./engine.ts";
import { ExtensionMessage, extensionMessenger } from "./extension-channel.ts";
import { fetchTutorView } from "./fetch-tutor-view.ts";
import { captureForSession } from "./live-capture.ts";
import type { LiveEngine } from "./live-engine.ts";
import { LiveState } from "./live-state.ts";
import { focusWindow, openLiveSession } from "./live-window.ts";
import type { Session } from "./session-schema.ts";
import { loadEngineSession, loadSession, updateSession } from "./session.ts";
import { loadLanguage } from "./settings.ts";
import { typeText } from "./typing.ts";
import { parseVscodeTitle } from "./vscode-title.ts";
import { VSCODE_ORIGIN } from "./vscode.ts";
import { within } from "./within.ts";
import { browser } from "wxt/browser";

const MAX_RESTARTS = 3;
const RESTART_WINDOW_MS = 10 * 60_000;
const CALL_TIMEOUT_MS = 60_000;

const Text = {
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
    promise: extensionMessenger.sendMessage(name, undefined, session.liveTab),
    fallback: null
  });
}

function sendMic(session: Session) {
  return within({
    timeoutMs: CALL_TIMEOUT_MS,
    promise: extensionMessenger.sendMessage(GlicCommand.SET_MIC, session.isMicOpen, session.liveTab),
    fallback: null
  });
}

let hasBorrowedFocus = false;

async function borrowFocus(session: Session) {
  hasBorrowedFocus = true;
  await focusWindow(session.liveWindow);
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
      tabId: session.liveTab,
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
  await browser.tabs.reload(session.liveTab).catch(() => {});
}

async function fail({ session, failure }: {
  session: Session;
  failure: BridgeFailure;
}) {
  if (failure === BridgeFailure.LIVE_BROKE) {
    return restart(session);
  }

  if (SIGN_IN_FAILURES.has(failure)) {
    await focusWindow(session.liveWindow);
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

function glicSession(tab: { id?: number } | undefined) {
  return loadEngineSession({
    engine: Engine.SUBSCRIPTION,
    tab
  });
}

export const glicEngine: LiveEngine = {
  async open(vscodeTab) {
    const brief = buildBrief({
      context: parseVscodeTitle(vscodeTab.title),
      language: await loadLanguage()
    });
    return openLiveSession({
      engine: Engine.SUBSCRIPTION,
      url: GLIC_URL,
      vscodeTab,
      brief
    });
  },
  stop(session) {
    return command({
      session,
      name: GlicCommand.STOP_LIVE
    });
  },
  async toggleMic(session) {
    const next = await updateSession({ isMicOpen: !session.isMicOpen });
    if (next) {
      await sendMic(next);
    }
  },
  retitle(session) {
    return extensionMessenger.sendMessage(ExtensionMessage.GLIC_RETITLE, {
      title: session.title,
      url: VSCODE_ORIGIN
    }, session.liveTab).catch(() => {});
  }
};

export function installGlic() {
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
    return session ? captureForSession(session) : null;
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
}
