import { context } from "esbuild";

const isWatching = process.argv.includes("--watch");

const bundle = await context({
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.js",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["vscode"],
  alias: { "@scripts": "../../scripts", "@": "./src" },
  sourcemap: true,
  minify: false
});

if (isWatching) await bundle.watch();
else {
  await bundle.rebuild();
  await bundle.dispose();
}
