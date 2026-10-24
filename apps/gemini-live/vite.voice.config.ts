import { VOICE_BUILD_RELATIVE_DIR, VOICE_PATH } from "../../scripts/lib/voice.ts";
import { SCRIPTS_ALIAS, SOURCE_ALIAS } from "./aliases.ts";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const VOICE_ROOT = fileURLToPath(new URL("src/voice", import.meta.url));
const VOICE_OUT_DIR = fileURLToPath(new URL(`../../${VOICE_BUILD_RELATIVE_DIR}`, import.meta.url));

export default defineConfig({
  root: VOICE_ROOT,
  base: VOICE_PATH,
  plugins: [svelte({
    configFile: false,
    preprocess: [vitePreprocess({ script: true })]
  })],
  resolve: {
    alias: {
      ...SCRIPTS_ALIAS,
      ...SOURCE_ALIAS
    }
  },
  build: {
    outDir: VOICE_OUT_DIR,
    emptyOutDir: true
  }
});
