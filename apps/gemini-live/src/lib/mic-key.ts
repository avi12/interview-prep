import { MIC_KEY_HOST } from "./mic-key-host.ts";
import { z } from "./zod.ts";
import { browser } from "wxt/browser";

export const MIC_KEY_LABEL = "M1";

const RECONNECT_MS = 10_000;

const hostMessageSchema = z.object({ type: z.literal("m1") });

export function listenToMicKey(toggle: () => void) {
  function connectHost() {
    const port = browser.runtime.connectNative(MIC_KEY_HOST);
    port.onMessage.addListener(message => {
      if (hostMessageSchema.safeParse(message).success) {
        toggle();
      }
    });
    port.onDisconnect.addListener(() => {
      void browser.runtime.lastError;
      setTimeout(connectHost, RECONNECT_MS);
    });
  }

  connectHost();
}
