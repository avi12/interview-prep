import type * as Esbuild from "esbuild-wasm";
import { dirname, extname, join, normalize } from "pathe";

import { EnginePath, mapImport } from "#scripts/lib/runner-bundle.ts";
import { engineUrl } from "@/runner/engine-url.ts";
import { type Host, HOST_GLOBAL, hostNameOf } from "@/runner/ts/host-modules.ts";
import { existsSync, readFileSync } from "@/runner/ts/node/fs.ts";
import { FILE_URL_PREFIX } from "@/runner/ts/protocol.ts";

const ENTRY = "entry";
const Namespace = {
  ENTRY: "entry",
  HOST: "host",
  FILE: "file"
} as const;
const LOADERS: Record<string, Esbuild.Loader> = {
  ".ts": "ts",
  ".mts": "ts",
  ".js": "js",
  ".mjs": "js",
  ".json": "json"
};
const TEXT_LOADER: Esbuild.Loader = "text";
const CODE_LOADERS = new Set<Esbuild.Loader>(["ts", "js"]);
const RESOLVE_SUFFIXES = ["", ".ts", "/index.ts", ".js"];
const IMPORT_META_URL = /\bimport\.meta\.url\b/g;
const IDENTIFIER_NAME = /^[A-Za-z_$][\w$]*$/;
const TEST_FILE = /\.test\.[cm]?[jt]s$/;
const BUILD_TARGET = "es2023";
const ANY_PATH = /.*/;
const ABSOLUTE_PREFIX = "/";
const RELATIVE_PREFIX = ".";
const JAVASCRIPT_TYPE = "text/javascript";

export interface BundleEntry {
  setupLoaders: Record<string, () => Promise<unknown>>;
  testLoader: () => Promise<unknown>;
  moduleLoaders: Record<string, () => Promise<Record<string, unknown>>>;
}

export async function startEsbuild() {
  const [esbuild, wasmModule]: [typeof Esbuild, WebAssembly.Module] = await Promise.all([
    import(/* @vite-ignore */ engineUrl(EnginePath.ESBUILD_MODULE).href),
    WebAssembly.compileStreaming(fetch(engineUrl(EnginePath.ESBUILD_WASM)))
  ]);
  await esbuild.initialize({
    wasmModule,
    worker: false
  });
  return esbuild;
}

function scopeExpression(bundleId: string) {
  return `globalThis.${HOST_GLOBAL}.scope(${JSON.stringify(bundleId)})`;
}

function loaderOf(path: string) {
  return LOADERS[extname(path)] ?? TEXT_LOADER;
}

function candidatePath({
  specifier,
  importer,
  importMap
}: {
  specifier: string;
  importer: string;
  importMap: Record<string, string>;
}) {
  const mapped = mapImport({
    specifier,
    importMap
  });
  if (mapped) {
    return mapped;
  }

  if (specifier.startsWith(ABSOLUTE_PREFIX)) {
    return normalize(specifier);
  }

  if (specifier.startsWith(RELATIVE_PREFIX)) {
    return join(dirname(importer), specifier);
  }

  return undefined;
}

function existingPath(path: string) {
  return RESOLVE_SUFFIXES.map(suffix => `${path}${suffix}`).find(
    candidate => existsSync(candidate) && extname(candidate) !== ""
  );
}

function hostStub({ name, bundleId, exportNames }: { name: string; bundleId: string; exportNames: string[] }) {
  const locals = exportNames
    .filter(key => IDENTIFIER_NAME.test(key))
    .map((key, index) => ({
      key,
      local: `e${index}`
    }));
  return [
    `const scope = ${scopeExpression(bundleId)};`,
    `const current = scope.module(${JSON.stringify(name)});`,
    ...locals.map(({ key, local }) => `let ${local} = current[${JSON.stringify(key)}];`),
    `export { ${locals.map(({ key, local }) => `${local} as ${key}`).join(", ")} };`,
    `scope.onSwap({ name: ${JSON.stringify(name)}, swap: next => { ${locals.map(({ key, local }) => `${local} = next[${JSON.stringify(key)}];`).join(" ")} } });`
  ].join("\n");
}

function preparedSource(path: string) {
  const source = String(readFileSync(path, "utf8"));
  if (!CODE_LOADERS.has(loaderOf(path))) {
    return source;
  }

  return source.replace(IMPORT_META_URL, JSON.stringify(`${FILE_URL_PREFIX}${path}`));
}

function entrySource({
  testFile,
  setupFiles,
  modulePaths
}: {
  testFile: string;
  setupFiles: string[];
  modulePaths: string[];
}) {
  function loaders(paths: string[]) {
    return paths.map(path => `${JSON.stringify(path)}: () => import(${JSON.stringify(path)})`).join(",\n");
  }

  return [
    `export const setupLoaders = {${loaders(setupFiles)}};`,
    `export const testLoader = () => import(${JSON.stringify(testFile)});`,
    `export const moduleLoaders = {${loaders(modulePaths)}};`
  ].join("\n");
}

function virtualFiles({
  host,
  bundleId,
  importMap,
  entry
}: {
  host: Host;
  bundleId: string;
  importMap: Record<string, string>;
  entry: string;
}) {
  return {
    name: "virtual-files",
    setup(build) {
      build.onResolve({ filter: ANY_PATH }, ({ path, importer, kind }) => {
        if (kind === "entry-point") {
          return {
            path: ENTRY,
            namespace: Namespace.ENTRY
          };
        }

        if (host.isHostModule(path)) {
          return {
            path: hostNameOf(path),
            namespace: Namespace.HOST
          };
        }

        const candidate = candidatePath({
          specifier: path,
          importer,
          importMap
        });
        const resolved = candidate && existingPath(candidate);
        if (!resolved) {
          return { errors: [{ text: `Cannot find module "${path}"${importer ? ` imported from ${importer}` : ""}` }] };
        }

        return {
          path: resolved,
          namespace: Namespace.FILE
        };
      });
      build.onLoad(
        {
          filter: ANY_PATH,
          namespace: Namespace.ENTRY
        },
        () => ({
          contents: entry,
          loader: "js"
        })
      );
      build.onLoad(
        {
          filter: ANY_PATH,
          namespace: Namespace.HOST
        },
        async ({ path }) => {
          await host.load(path);
          return {
            contents: hostStub({
              name: path,
              bundleId,
              exportNames: host.scope(bundleId).exportNames(path)
            }),
            loader: "js"
          };
        }
      );
      build.onLoad(
        {
          filter: ANY_PATH,
          namespace: Namespace.FILE
        },
        ({ path }) => ({
          contents: preparedSource(path),
          loader: loaderOf(path)
        })
      );
    }
  } satisfies Esbuild.Plugin;
}

function isBuildFailure(error: unknown): error is Esbuild.BuildFailure {
  return error instanceof Error && "errors" in error && Array.isArray(error.errors);
}

function buildErrorText(error: unknown) {
  if (!isBuildFailure(error)) {
    return String(error);
  }

  return error.errors
    .map(({ text, location }) => (location ? `${location.file}:${location.line}:${location.column}: ${text}` : text))
    .join("\n");
}

export async function buildBundle({
  esbuild,
  host,
  bundleId,
  testFile,
  setupFiles,
  moduleFiles,
  importMap
}: {
  esbuild: typeof Esbuild;
  host: Host;
  bundleId: string;
  testFile: string;
  setupFiles: string[];
  moduleFiles: string[];
  importMap: Record<string, string>;
}) {
  const entry = entrySource({
    testFile,
    setupFiles,
    modulePaths: moduleFiles.filter(path => CODE_LOADERS.has(loaderOf(path)) && !TEST_FILE.test(path))
  });
  try {
    const result = await esbuild.build({
      entryPoints: [ENTRY],
      bundle: true,
      write: false,
      format: "esm",
      platform: "neutral",
      target: BUILD_TARGET,
      logLevel: "silent",
      sourcemap: "inline",
      tsconfigRaw: {
        compilerOptions: {
          verbatimModuleSyntax: true
        }
      },
      plugins: [
        virtualFiles({
          host,
          bundleId,
          importMap,
          entry
        })
      ]
    });
    return {
      isOk: true,
      code: result.outputFiles[0].text,
      error: ""
    } as const;
  } catch (error) {
    return {
      isOk: false,
      code: "",
      error: buildErrorText(error)
    } as const;
  }
}

export async function importBundle(code: string) {
  const url = URL.createObjectURL(new Blob([code], { type: JAVASCRIPT_TYPE }));
  try {
    const loaded: BundleEntry = await import(/* @vite-ignore */ url);
    return loaded;
  } finally {
    URL.revokeObjectURL(url);
  }
}
