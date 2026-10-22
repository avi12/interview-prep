import TutorChip from "./TutorChip.svelte";
import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
import { focusRect } from "@/lib/focus-rect.ts";
import { VSCODE_ORIGIN } from "@/lib/vscode.ts";
import { defineContentScript } from "#imports";
import { mount } from "svelte";

const WORKBENCH = ".monaco-workbench";
const WORKBENCH_WAIT_MS = 10_000;

function findWorkbench() {
  return new Promise<Element | null>(resolve => {
    const found = document.querySelector(WORKBENCH);
    if (found) {
      resolve(found);
      return;
    }

    const observer = new MutationObserver(() => {
      const workbench = document.querySelector(WORKBENCH);
      if (workbench) {
        observer.disconnect();
        resolve(workbench);
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, WORKBENCH_WAIT_MS);
  });
}

export default defineContentScript({
  matches: [`${VSCODE_ORIGIN}/*`],
  runAt: "document_idle",
  cssInjectionMode: "manifest",
  async main() {
    extensionMessenger.onMessage(ExtensionMessage.VSCODE_FOCUS_RECT, focusRect);
    const target = await findWorkbench() ?? document.body;
    mount(TutorChip, { target });
  }
});
