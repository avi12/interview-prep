import { GEMINI_LIVE_PAGE_MATCHES, GEMINI_LIVE_VERSION_ATTRIBUTE } from "@scripts/lib/gemini-live-extension.ts";
import { browser } from "wxt/browser";

import { defineContentScript } from "#imports";

export default defineContentScript({
  matches: GEMINI_LIVE_PAGE_MATCHES,
  runAt: "document_start",
  main() {
    document.documentElement.setAttribute(GEMINI_LIVE_VERSION_ATTRIBUTE, browser.runtime.getManifest().version);
  }
});
