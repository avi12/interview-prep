import { readJsonFile } from "#scripts/lib/files.ts";
import { ROOT, RUNNER_DIST_DIR, WEB_APP_DIR } from "#scripts/lib/paths.ts";
import { EnginePath, PgliteFile, PYODIDE_BASE_PACKAGES, PYODIDE_MODULE_FILE } from "#scripts/lib/runner-bundle.ts";
import { z } from "#scripts/lib/zod.ts";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const PYODIDE_CORE_FILES = ["pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json", PYODIDE_MODULE_FILE];
const PYODIDE_LOCK_FILE = "pyodide-lock.json";
const PGLITE_FILE = /\.(js|wasm|data)$/;
const ESBUILD_BROWSER_MODULE = "esm/browser.min.js";
const ESBUILD_WASM = "esbuild.wasm";
const REQUIREMENTS_FILE = resolve(ROOT, "requirements.txt");
const REQUIREMENT_NAME = /^\s*([A-Za-z0-9_.-]+)/;
const NAME_SEPARATORS = /[-_.]+/g;
const CANONICAL_SEPARATOR = "-";
const BYTES_PER_MB = 1024 * 1024;
const SIZE_DIGITS = 1;

const lockSchema = z.object({
  packages: z.record(
    z.string(), z.object({
      file_name: z.string(),
      depends: z.array(z.string())
    })
  )
});
const versionSchema = z.object({ version: z.string() });

const requireFromWeb = createRequire(resolve(WEB_APP_DIR, "package.json"));

function packageDir(name: string) {
  return dirname(realpathSync(requireFromWeb.resolve(`${name}/package.json`)));
}

function copyInto({ from, to }: {
  from: string;
  to: string;
}) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

function canonicalName(name: string) {
  return name.toLowerCase().replaceAll(NAME_SEPARATORS, CANONICAL_SEPARATOR);
}

function requirementNames() {
  const names: string[] = [];
  for (const line of readFileSync(REQUIREMENTS_FILE, "utf8").split("\n")) {
    const name = REQUIREMENT_NAME.exec(line)?.[1];
    if (name) {
      names.push(name);
    }
  }
  return names;
}

function wheelClosure({ roots, packages }: {
  roots: string[];
  packages: z.infer<typeof lockSchema>["packages"];
}) {
  const seen = new Set<string>();
  const pending = roots.map(canonicalName);
  for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
    if (seen.has(name)) {
      continue;
    }

    const entry = packages[name];
    if (!entry) {
      throw new Error(`Python package ${name} is not available in Pyodide`);
    }

    seen.add(name);
    pending.push(...entry.depends.map(canonicalName));
  }
  return [...seen].map(name => packages[name].file_name);
}

async function download({ url, to }: {
  url: string;
  to: string;
}) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed for ${url}: ${response.status}`);
  }

  writeFileSync(to, Buffer.from(await response.arrayBuffer()));
}

function copyEsbuild() {
  const dir = packageDir("esbuild-wasm");
  copyInto({
    from: resolve(dir, ESBUILD_WASM),
    to: resolve(RUNNER_DIST_DIR, EnginePath.esbuildWasm)
  });
  copyInto({
    from: resolve(dir, ESBUILD_BROWSER_MODULE),
    to: resolve(RUNNER_DIST_DIR, EnginePath.esbuildModule)
  });
}

function copyPglite() {
  const distDir = dirname(realpathSync(requireFromWeb.resolve("@electric-sql/pglite")));
  for (const name of readdirSync(distDir)) {
    if (PGLITE_FILE.test(name)) {
      copyInto({
        from: resolve(distDir, name),
        to: resolve(RUNNER_DIST_DIR, EnginePath.pgliteDir, name)
      });
    }
  }
  for (const name of Object.values(PgliteFile)) {
    if (!existsSync(resolve(RUNNER_DIST_DIR, EnginePath.pgliteDir, name))) {
      throw new Error(`PGlite is missing ${name}`);
    }
  }
}

async function copyPyodide() {
  const dir = packageDir("pyodide");
  const outDir = resolve(RUNNER_DIST_DIR, EnginePath.pyodideDir);
  for (const name of PYODIDE_CORE_FILES) {
    copyInto({
      from: resolve(dir, name),
      to: resolve(outDir, name)
    });
  }
  const { version } = readJsonFile({
    path: resolve(dir, "package.json"),
    schema: versionSchema
  });
  const { packages } = readJsonFile({
    path: resolve(dir, PYODIDE_LOCK_FILE),
    schema: lockSchema
  });
  const wheels = wheelClosure({
    roots: [...PYODIDE_BASE_PACKAGES, ...requirementNames()],
    packages
  });
  for (const file of wheels) {
    const to = resolve(outDir, file);
    if (existsSync(to)) {
      continue;
    }

    await download({
      url: `https://cdn.jsdelivr.net/pyodide/v${version}/full/${file}`,
      to
    });
    console.log(`  fetched ${file}`);
  }
  return wheels.length;
}

function sizeOf(path: string): number {
  const stats = statSync(path);
  if (!stats.isDirectory()) {
    return stats.size;
  }

  let total = 0;
  for (const name of readdirSync(path)) {
    total += sizeOf(resolve(path, name));
  }
  return total;
}

copyEsbuild();
copyPglite();
const wheelCount = await copyPyodide();
for (const path of Object.values(EnginePath)) {
  console.log(`${path}: ${(sizeOf(resolve(RUNNER_DIST_DIR, path)) / BYTES_PER_MB).toFixed(SIZE_DIGITS)} MB`);
}
console.log(`Self-hosted the test engines and ${wheelCount} Python packages in ${RUNNER_DIST_DIR}`);
