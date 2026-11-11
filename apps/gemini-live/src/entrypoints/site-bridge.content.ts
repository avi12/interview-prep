import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
import { focusRect } from "@/lib/focus-rect.ts";
import { listenToMicCombo } from "@/lib/mic-combo-listener.ts";
import { parseSession } from "@/lib/session-schema.ts";
import { loadSession, sessionItem } from "@/lib/session.ts";
import { loadEngine } from "@/lib/settings.ts";
import { SiteBridgeMessage, siteMessenger, voiceStatusOfSession } from "@/lib/site-bridge.ts";
import { GEMINI_LIVE_PAGE_MATCHES } from "@scripts/lib/gemini-live-extension.ts";
import { defineContentScript } from "#imports";

export default defineContentScript({
  matches: GEMINI_LIVE_PAGE_MATCHES,
  runAt: "document_idle",
  main() {
    extensionMessenger.onMessage(ExtensionMessage.VSCODE_FOCUS_RECT, focusRect);
    listenToMicCombo();

    siteMessenger.onMessage(SiteBridgeMessage.START, () =>
      extensionMessenger.sendMessage(ExtensionMessage.LIVE_START).catch((error: Error) => ({
        isStarted: false,
        detail: error.message
      })));
    siteMessenger.onMessage(SiteBridgeMessage.STOP, () =>
      extensionMessenger.sendMessage(ExtensionMessage.LIVE_STOP).catch(() => {}));
    siteMessenger.onMessage(SiteBridgeMessage.TOGGLE_MIC, () =>
      extensionMessenger.sendMessage(ExtensionMessage.MIC_TOGGLE).catch(() => {}));
    siteMessenger.onMessage(SiteBridgeMessage.GET_ENGINE, () => loadEngine());
    siteMessenger.onMessage(SiteBridgeMessage.GET_STATUS, async () => voiceStatusOfSession(await loadSession()));

    sessionItem.watch(raw => {
      const status = voiceStatusOfSession(parseSession(raw));
      void siteMessenger.sendMessage(SiteBridgeMessage.STATUS_CHANGED, status).catch(() => {});
    });
  }
});
