import { micKeyText } from "./mic-key-choice.ts";
import { micKeyItem, parseMicKey } from "./settings.ts";

export function watchMicKeyHint(onHint: (hint: string) => void) {
  function show(raw: unknown) {
    onHint(micKeyText(parseMicKey(raw)));
  }

  void micKeyItem.getValue().then(show);
  return micKeyItem.watch(show);
}
