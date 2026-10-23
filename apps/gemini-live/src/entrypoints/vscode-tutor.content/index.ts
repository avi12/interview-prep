import TutorChip from "./TutorChip.svelte";
import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
import { focusRect } from "@/lib/focus-rect.ts";
import { VSCODE_ORIGIN } from "@/lib/vscode.ts";
import { defineContentScript } from "#imports";
import { mount } from "svelte";

const TITLE_BAR_RIGHT = ".titlebar-right";
const TITLE_BAR_WAIT_MS = 10_000;

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
    const titleBar = await waitForElement(TITLE_BAR_RIGHT);
    mount(TutorChip, {
      target: titleBar ?? document.body,
      anchor: titleBar?.firstChild ?? undefined
    });
  }
});
