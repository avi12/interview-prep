import { Engine } from "./engine.ts";
import { ExtensionMessage, extensionMessenger, type StartResult } from "./extension-channel.ts";
import { glicEngine, installGlic } from "./glic-live.ts";
import type { LiveEngine } from "./live-engine.ts";
import { isRunning } from "./live-state.ts";
import { closeWindow, refused } from "./live-window.ts";
import { listenToMicKey } from "./mic-key.ts";
import type { Session } from "./session-schema.ts";
import { clearSession, loadSession, updateSession } from "./session.ts";
import { loadEngine } from "./settings.ts";
import { installVoice, voiceEngine } from "./voice-live.ts";
import { findVscodeTab, isVscodeUrl, VSCODE_ORIGIN } from "./vscode.ts";
import { browser } from "wxt/browser";

const LIVE_ENGINE: Record<Engine, LiveEngine> = {
  [Engine.SUBSCRIPTION]: glicEngine,
  [Engine.API_KEY]: voiceEngine
};

const Text = {
  NO_VSCODE_TAB: `Open VS Code in this browser first (${VSCODE_ORIGIN}), then press start`,
  ALREADY_STARTING: "Already starting a session"
} as const;

let starting: Promise<StartResult> | null = null;

async function toggleMic() {
  const session = await loadSession();
  if (!session || !isRunning(session.state)) {
    return;
  }

  await LIVE_ENGINE[session.engine].toggleMic(session);
}

async function isVscodeInFront(session: Session) {
  const focusedWindow = await browser.windows.getLastFocused({ populate: true }).catch(() => null);
  if (!focusedWindow?.focused) {
    return false;
  }

  return !!focusedWindow.tabs?.some(tab => tab.active && tab.id === session.vscodeTab);
}

async function toggleMicFromKey() {
  const session = await loadSession();
  if (session && await isVscodeInFront(session)) {
    await toggleMic();
  }
}

async function openSession() {
  const vscodeTab = await findVscodeTab();
  if (vscodeTab?.id === undefined) {
    return refused(Text.NO_VSCODE_TAB);
  }

  const engine = await loadEngine();
  return LIVE_ENGINE[engine].open({
    id: vscodeTab.id,
    windowId: vscodeTab.windowId,
    title: vscodeTab.title ?? ""
  });
}

async function replaceSession() {
  const previous = await loadSession();
  if (previous) {
    await clearSession();
    await closeWindow(previous.liveWindow);
  }

  return openSession();
}

async function startSession() {
  if (starting) {
    return refused(Text.ALREADY_STARTING);
  }

  starting = replaceSession();
  try {
    return await starting;
  } finally {
    starting = null;
  }
}

async function stopSession() {
  const session = await loadSession();
  if (!session) {
    return;
  }

  await LIVE_ENGINE[session.engine].stop(session);
  await clearSession();
  await closeWindow(session.liveWindow);
}

async function resetSession() {
  const session = await loadSession();
  if (!session) {
    return;
  }

  await clearSession();
  await closeWindow(session.liveWindow);
}

async function retitle({ tabId, title }: {
  tabId: number;
  title: string;
}) {
  const session = await loadSession();
  if (session?.vscodeTab !== tabId) {
    return;
  }

  const next = await updateSession({ title });
  if (next) {
    await LIVE_ENGINE[next.engine].retitle(next);
  }
}

export function installLive() {
  extensionMessenger.onMessage(ExtensionMessage.LIVE_START, startSession);
  extensionMessenger.onMessage(ExtensionMessage.LIVE_STOP, stopSession);
  extensionMessenger.onMessage(ExtensionMessage.MIC_TOGGLE, toggleMic);
  const micKey = listenToMicKey(() => void toggleMicFromKey());
  extensionMessenger.onMessage(ExtensionMessage.MIC_KEY_TEACH, ({ data }) => micKey.teach(data));
  extensionMessenger.onMessage(ExtensionMessage.MIC_KEY_CANCEL_TEACH, micKey.cancelTeach);
  installGlic();
  installVoice({ untilStarted: () => starting ?? Promise.resolve() });

  browser.windows.onRemoved.addListener(async windowId => {
    const session = await loadSession();
    if (session?.liveWindow === windowId) {
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
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    const isDevReload = import.meta.env.DEV && reason === browser.runtime.OnInstalledReason.UPDATE;
    if (isDevReload) {
      return;
    }

    await resetSession();
  });
}
