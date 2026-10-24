import TutorChip from "./TutorChip.svelte";
import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
import { focusRect } from "@/lib/focus-rect.ts";
import { listenToMicCombo } from "@/lib/mic-combo-listener.ts";
import { VSCODE_ORIGIN } from "@/lib/vscode.ts";
import { VOICE_STATUS_ITEM_ID } from "@scripts/lib/voice.ts";
import { defineContentScript } from "#imports";
import { mount } from "svelte";

const TITLE_BAR_RIGHT = ".titlebar-right";
const TITLE_BAR_WAIT_MS = 10_000;
const HIDE_VOICE_STATUS_ITEM_CSS = `.statusbar-item[id$=".${VOICE_STATUS_ITEM_ID}"] { display: none !important; }`;

function hideVoiceStatusItem() {
  const elStyle = document.createElement("style");
  elStyle.textContent = HIDE_VOICE_STATUS_ITEM_CSS;
  document.head.append(elStyle);
}

function waitForElement(selector: string) {
  return new Promise<Element | null>(resolve => {
    const found = document.querySelector(selector);
    if (found) {
      resolve(found);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, TITLE_BAR_WAIT_MS);
  });
}

export default defineContentScript({
  matches: [`${VSCODE_ORIGIN}/*`],
  runAt: "document_idle",
  cssInjectionMode: "manifest",
  async main() {
    extensionMessenger.onMessage(ExtensionMessage.VSCODE_FOCUS_RECT, focusRect);
    listenToMicCombo();
    hideVoiceStatusItem();
    const titleBar = await waitForElement(TITLE_BAR_RIGHT);
    mount(TutorChip, {
      target: titleBar ?? document.body,
      anchor: titleBar?.firstChild ?? undefined
    });
  }
});
