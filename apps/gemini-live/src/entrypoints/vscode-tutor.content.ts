import { defineContentScript } from "#imports";
import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
import { focusRect } from "@/lib/focus-rect.ts";
import { isRunning } from "@/lib/live-state.ts";
import { MIC_KEY_LABEL } from "@/lib/mic-key.ts";
import { sessionLabel, sessionText, sessionTone, Tone } from "@/lib/live-status.ts";
import { parseSession, sessionItem, type Session } from "@/lib/session.ts";
import { VSCODE_ORIGIN } from "@/lib/vscode.ts";
import "@/styles/vscode-tutor.css";

const WORKBENCH = ".monaco-workbench";
const MOUNT_POLL_MS = 250;
const MOUNT_TRIES = 40;
const START_LABEL = "Start voice tutor";
const STOP_LABEL = "Stop voice tutor";
const MUTE_LABEL = "Mute";
const UNMUTE_LABEL = "Talk";

const createButton = (className: string) => {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  return button;
};

const createPanel = () => {
  const panel = document.createElement("div");
  panel.className = "ip-tutor-panel";
  const button = createButton("ip-tutor");
  const mic = createButton("ip-tutor ip-tutor-mic");
  mic.title = `Mute or unmute your mic (${MIC_KEY_LABEL})`;
  const status = document.createElement("span");
  status.className = "ip-tutor-status";
  panel.append(status, mic, button);
  return { panel, button, mic, status };
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mountInWorkbench = async (panel: HTMLElement) => {
  for (let attempt = 0; attempt < MOUNT_TRIES; attempt++) {
    const workbench = document.querySelector(WORKBENCH);
    if (workbench) return workbench.append(panel);
    await sleep(MOUNT_POLL_MS);
  }
  document.body.append(panel);
};

export default defineContentScript({
  matches: [`${VSCODE_ORIGIN}/*`],
  runAt: "document_idle",
  main() {
    const { panel, button, mic, status } = createPanel();
    let session: Session | null = null;

    const render = () => {
      const isLive = !!session && isRunning(session.state);
      button.textContent = isLive ? STOP_LABEL : START_LABEL;
      mic.textContent = session?.isMicOpen ? MUTE_LABEL : UNMUTE_LABEL;
      mic.hidden = !isLive;
      panel.dataset.tone = sessionTone(session);
      status.textContent = session ? sessionLabel(session) : "";
      panel.title = session ? sessionText(session) : "";
      status.hidden = !session;
    };

    const toggle = async () => {
      if (session && isRunning(session.state)) return extensionMessenger.sendMessage(ExtensionMessage.LIVE_STOP);
      const result = await extensionMessenger
        .sendMessage(ExtensionMessage.LIVE_START)
        .catch((error: Error) => ({ isStarted: false, detail: error.message }));
      if (result.isStarted) return;
      status.hidden = false;
      status.textContent = result.detail;
      panel.title = result.detail;
      panel.dataset.tone = Tone.DANGER;
    };

    extensionMessenger.onMessage(ExtensionMessage.VSCODE_FOCUS_RECT, focusRect);

    const toggleMic = () => void extensionMessenger.sendMessage(ExtensionMessage.MIC_TOGGLE).catch(() => {});
    button.addEventListener("click", toggle);
    mic.addEventListener("click", toggleMic);
    sessionItem.watch(raw => {
      session = parseSession(raw);
      render();
    });
    void sessionItem.getValue().then(raw => {
      session = parseSession(raw);
      render();
    });
    render();
    void mountInWorkbench(panel);
  }
});
