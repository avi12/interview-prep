import { context } from "esbuild";

import { SOURCE_ALIASES } from "./src/aliases.mts";

const webviewElements = await context({
  entryPoints: {
    elements: "src/webview/elements.ts"
  },
  outdir: "dist/webview",
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "es2022",
  minify: true
});

const IS_WATCHING = process.argv.includes("--watch");

const bundle = await context({
  entryPoints: {
    extension: "src/loader.ts",
    app: "src/extension.ts"
  },
  outdir: "dist",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["vscode"],
  alias: SOURCE_ALIASES,
  sourcemap: true,
  minify: false
});
if (IS_WATCHING) {
  await bundle.watch();
  await webviewElements.watch();
} else {
  await bundle.rebuild();
  await bundle.dispose();
  await webviewElements.rebuild();
  await webviewElements.dispose();
}
