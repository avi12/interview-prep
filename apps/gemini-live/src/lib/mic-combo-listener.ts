import { ExtensionMessage, extensionMessenger } from "./extension-channel.ts";
import { isComboEvent } from "./key-combo.ts";
import { isRunning } from "./live-state.ts";
import { DEFAULT_MIC_KEY, MicKeyKind } from "./mic-key-choice.ts";
import { parseSession } from "./session-schema.ts";
import { sessionItem } from "./session.ts";
import { micKeyItem, parseMicKey } from "./settings.ts";

export function listenToMicCombo() {
  let micKey = DEFAULT_MIC_KEY;
  let isLive = false;

  function showMicKey(raw: unknown) {
    micKey = parseMicKey(raw);
  }

  function showSession(raw: unknown) {
    const session = parseSession(raw);
    isLive = !!session && isRunning(session.state);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!isLive || event.repeat || micKey.kind !== MicKeyKind.COMBO || !isComboEvent({
      combo: micKey.combo,
      event
    })) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    void extensionMessenger.sendMessage(ExtensionMessage.MIC_TOGGLE).catch(() => {});
  }

  void micKeyItem.getValue().then(showMicKey);
  void sessionItem.getValue().then(showSession);
  micKeyItem.watch(showMicKey);
  sessionItem.watch(showSession);
  window.addEventListener("keydown", onKeyDown, { capture: true });
}
