import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_DIR = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(APP_DIR, "dist-server");
const EXTERNAL_PACKAGES = ["firebase-admin"];

function installedVersion(name: string) {
  const manifest: unknown = JSON.parse(readFileSync(resolve(APP_DIR, "node_modules", name, "package.json"), "utf8"));
  if (typeof manifest !== "object" || manifest === null || !("version" in manifest) || typeof manifest.version !== "string") {
    throw new Error(`Cannot read the installed version of ${name}`);
  }

  return manifest.version;
}

await build({
  entryPoints: [resolve(APP_DIR, "server", "main.ts")],
  outfile: resolve(OUT_DIR, "server.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  sourcemap: true,
  legalComments: "linked",
  external: EXTERNAL_PACKAGES.flatMap(name => [name, `${name}/*`]),
  tsconfig: resolve(APP_DIR, "tsconfig.json"),
  logLevel: "info"
});

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  resolve(OUT_DIR, "package.json"), `${JSON.stringify({
    name: "interview-prep-web-server",
    private: true,
    type: "module",
    dependencies: Object.fromEntries(EXTERNAL_PACKAGES.map(name => [name, installedVersion(name)]))
  }, null, 2)}\n`
);
