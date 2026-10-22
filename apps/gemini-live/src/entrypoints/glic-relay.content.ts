import { defineContentScript } from "#imports";
import { browser } from "wxt/browser";
import { bridgeMessenger, BridgeMessage } from "@/lib/bridge-channel.ts";
import { GLIC_URL, GlicCommand, GlicReport, type Activation } from "@/lib/bridge-vocab.ts";
import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
import { promptClipPath } from "@/lib/prompt-clip.ts";
import { loadLanguage } from "@/lib/settings.ts";

/*
 * Beside the bridge, in the extension's world: only this world reaches the worker, and
 * the two share the document, so they talk through DOM events. It asks the worker whether
 * this tab was opened for a session before it lets the bridge take the page over.
 */

const HELLO_TRIES = 5;
const HELLO_GAP_MS = 400;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const askWorkerWhoOwnsTab = async () => {
  for (let attempt = 0; attempt < HELLO_TRIES; attempt++) {
    const hello = await extensionMessenger.sendMessage(ExtensionMessage.GLIC_HELLO).catch(() => null);
    if (hello?.isMine) return { title: hello.title, url: hello.url };
    await sleep(HELLO_GAP_MS);
  }
  return null;
};

export default defineContentScript({
  matches: [`${GLIC_URL}*`],
  runAt: "document_start",

  async main() {
    let activation: Activation | null = null;
    const activate = (next: Activation) => {
      activation = next;
      void bridgeMessenger.sendMessage(BridgeMessage.ACTIVATE, next).catch(() => {});
    };

    bridgeMessenger.onMessage(BridgeMessage.PRESENT, () => activation);
    bridgeMessenger.onMessage(BridgeMessage.CAPTURE, () => extensionMessenger.sendMessage(ExtensionMessage.GLIC_CAPTURE).catch(() => null));
    bridgeMessenger.onMessage(BridgeMessage.PROMPT_CLIP, async ({ data }) =>
      browser.runtime.getURL(promptClipPath({ event: data.event, language: await loadLanguage() }))
    );
    bridgeMessenger.onMessage(BridgeMessage.TUTOR_VIEW, () => extensionMessenger.sendMessage(ExtensionMessage.GLIC_TUTOR_VIEW).catch(() => null));
    const toWorker = (sending: Promise<void>) => void sending.catch(() => {});
    bridgeMessenger.onMessage(GlicReport.BOOTED, () => toWorker(extensionMessenger.sendMessage(GlicReport.BOOTED)));
    bridgeMessenger.onMessage(GlicReport.READY, () => toWorker(extensionMessenger.sendMessage(GlicReport.READY)));
    bridgeMessenger.onMessage(GlicReport.STATE, ({ data }) => toWorker(extensionMessenger.sendMessage(GlicReport.STATE, data)));
    bridgeMessenger.onMessage(GlicReport.FAILED, ({ data }) => toWorker(extensionMessenger.sendMessage(GlicReport.FAILED, data)));
    extensionMessenger.onMessage(ExtensionMessage.GLIC_RETITLE, ({ data }) => {
      if (activation) activate(data);
    });
    extensionMessenger.onMessage(GlicCommand.START_LIVE, () => bridgeMessenger.sendMessage(GlicCommand.START_LIVE));
    extensionMessenger.onMessage(GlicCommand.STOP_LIVE, () => bridgeMessenger.sendMessage(GlicCommand.STOP_LIVE));
    extensionMessenger.onMessage(GlicCommand.BEGIN_TEXT, () => bridgeMessenger.sendMessage(GlicCommand.BEGIN_TEXT));
    extensionMessenger.onMessage(GlicCommand.SUBMIT, () => bridgeMessenger.sendMessage(GlicCommand.SUBMIT));
    extensionMessenger.onMessage(GlicCommand.SET_MIC, ({ data }) => bridgeMessenger.sendMessage(GlicCommand.SET_MIC, data));

    const owned = await askWorkerWhoOwnsTab();
    if (owned) activate(owned);
  }
});
