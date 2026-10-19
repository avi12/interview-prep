import { defineContentScript } from "#imports";
import { bridgeMessenger, BridgeMessage } from "@/lib/bridge-channel.ts";
import { GLIC_URL, type Activation } from "@/lib/bridge-vocab.ts";
import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
import { within } from "@/lib/within.ts";

/*
 * Beside the bridge, in the extension's world: only this world reaches the worker, and
 * the two share the document, so they talk through DOM events. It asks the worker whether
 * this tab was opened for a session before it lets the bridge take the page over.
 */

const CALL_TIMEOUT_MS = 60_000;
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
    bridgeMessenger.onMessage(BridgeMessage.REPORT, ({ data }) => {
      void extensionMessenger.sendMessage(ExtensionMessage.GLIC_REPORT, data).catch(() => {});
    });
    extensionMessenger.onMessage(ExtensionMessage.GLIC_RETITLE, ({ data }) => {
      if (activation) activate(data);
    });
    extensionMessenger.onMessage(ExtensionMessage.GLIC_CALL, ({ data }) =>
      within({ ms: CALL_TIMEOUT_MS, promise: bridgeMessenger.sendMessage(BridgeMessage.CALL, data), fallback: null })
    );

    const owned = await askWorkerWhoOwnsTab();
    if (owned) activate(owned);
  }
});
