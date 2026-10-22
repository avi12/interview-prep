import { oneLine } from "./text.ts";
import { browser } from "wxt/browser";

const DEBUGGER_PROTOCOL_VERSION = "1.3";
const KEY_EVENT = "Input.dispatchKeyEvent";

export async function typeText({ tabId, text }: {
  tabId: number;
  text: string;
}) {
  const target = { tabId };
  await browser.debugger.attach(target, DEBUGGER_PROTOCOL_VERSION);
  try {
    for (const char of oneLine(text)) {
      await browser.debugger.sendCommand(target, KEY_EVENT, {
        type: "keyDown",
        text: char,
        unmodifiedText: char,
        key: char
      });
      await browser.debugger.sendCommand(target, KEY_EVENT, {
        type: "keyUp",
        key: char
      });
    }
  } finally {
    await browser.debugger.detach(target).catch(() => {});
  }
}
