import { resolve } from "node:path";

import { build } from "esbuild";

import { ROOT } from "#scripts/lib/paths.ts";

const RUNTIME_ENTRY = resolve(ROOT, "apps", "web", "src", "narration", "runtime.ts");
const WEB_TSCONFIG = resolve(ROOT, "apps", "web", "tsconfig.json");
const RUNTIME_TARGET = "es2022";

export async function bundleNarrationRuntime() {
  const result = await build({
    entryPoints: [RUNTIME_ENTRY],
    bundle: true,
    format: "iife",
    minify: true,
    write: false,
    target: RUNTIME_TARGET,
    tsconfig: WEB_TSCONFIG
  });
  return result.outputFiles[0]?.text ?? "";
}
