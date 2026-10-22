import { defineConfig } from "wxt";
import { serverOrigin, tutorViewUrl } from "../../scripts/lib/server.ts";
import { SCRIPTS_ALIAS } from "./aliases.ts";

const vscodeOrigin = process.env.VSCODE_ORIGIN ?? serverOrigin();
process.env.WXT_VSCODE_ORIGIN = vscodeOrigin;
process.env.WXT_TUTOR_VIEW_URL = process.env.TUTOR_VIEW_URL ?? tutorViewUrl();

const HOST_PERMISSION_CAPTURE_VISIBLE_TAB_REQUIRES = "<all_urls>";

export default defineConfig({
  srcDir: "src",
  alias: SCRIPTS_ALIAS,
  outDir: process.env.WXT_OUT_DIR ?? ".output",
  manifest: {
    name: "Interview Prep: Gemini Live tutor",
    description: "A voice tutor from Gemini Live that sees your VS Code tab and coaches you through the lesson",
    permissions: ["storage", "debugger"],
    host_permissions: [`${vscodeOrigin}/*`, "https://gemini.google.com/*", HOST_PERMISSION_CAPTURE_VISIBLE_TAB_REQUIRES]
  }
});
