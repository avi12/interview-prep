import { defineContentScript } from "#imports";
import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
import { isRunning } from "@/lib/live-state.ts";
import { sessionText, sessionTone, Tone } from "@/lib/live-status.ts";
import { parseSession, sessionItem, type Session } from "@/lib/session.ts";
import { VSCODE_ORIGIN } from "@/lib/vscode.ts";
import "@/styles/vscode-tutor.css";

const START_LABEL = "Start voice tutor";
const STOP_LABEL = "Stop voice tutor";

const createButton = () => {
  const button = document.createElement("button");
  button.className = "ip-tutor";
  button.type = "button";
  return button;
};

const createPanel = () => {
  const panel = document.createElement("div");
  panel.className = "ip-tutor-panel";
  const button = createButton();
  const status = document.createElement("span");
  status.className = "ip-tutor-status";
  panel.append(button, status);
  return { panel, button, status };
};

export default defineContentScript({
  matches: [`${VSCODE_ORIGIN}/*`],
  runAt: "document_idle",
  main() {
    const { panel, button, status } = createPanel();
    let session: Session | null = null;

    const render = () => {
      const isLive = !!session && isRunning(session.state);
      button.textContent = isLive ? STOP_LABEL : START_LABEL;
      panel.dataset.tone = sessionTone(session);
      status.textContent = session ? sessionText(session) : "";
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
      panel.dataset.tone = Tone.DANGER;
    };

    button.addEventListener("click", toggle);
    sessionItem.watch(raw => {
      session = parseSession(raw);
      render();
    });
    void sessionItem.getValue().then(raw => {
      session = parseSession(raw);
      render();
    });
    render();
    document.body.append(panel);
  }
});
