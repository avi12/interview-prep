import { tutorViewUrl } from "../../scripts/lib/server.ts";
import { SCRIPTS_ALIAS } from "./aliases.ts";
import { EXTENSION_KEY } from "./extension-identity.ts";
import { PROMPT_CLIP_GLOB } from "./src/lib/prompt-clip.ts";
import { resolveVscodeOrigin } from "./vscode-origin.ts";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "wxt";

const vscodeOrigin = resolveVscodeOrigin();
process.env.WXT_VSCODE_ORIGIN = vscodeOrigin;
process.env.WXT_TUTOR_VIEW_URL = process.env.TUTOR_VIEW_URL ?? tutorViewUrl();

const HOST_PERMISSION_CAPTURE_VISIBLE_TAB_REQUIRES = "<all_urls>";

export default defineConfig({
  srcDir: "src",
  alias: SCRIPTS_ALIAS,
  outDir: process.env.WXT_OUT_DIR ?? ".output",
  modules: ["@wxt-dev/module-svelte"],
  svelte: {
    vite: {
      preprocess: [vitePreprocess({ script: true })]
    }
  },
  manifest: {
    name: "Interview Prep: Gemini Live tutor",
    description: "A voice tutor from Gemini Live that sees your VS Code tab and coaches you through the lesson",
    key: EXTENSION_KEY,
    permissions: ["storage", "debugger", "nativeMessaging"],
    host_permissions: [`${vscodeOrigin}/*`, "https://gemini.google.com/*", HOST_PERMISSION_CAPTURE_VISIBLE_TAB_REQUIRES],
    web_accessible_resources: [{
      resources: [PROMPT_CLIP_GLOB],
      matches: ["https://gemini.google.com/*"]
    }]
  }
});
