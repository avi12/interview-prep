import {
  API_PATH,
  COURSE_PATH,
  HASHED_ASSETS_DIR_NAME,
  RUNNER_PATH,
  VERSION_FILE_NAME,
  WORKERS_DIR_NAME
} from "./src/lib/web-paths.ts";
import { extensionSourceAliases } from "interview-prep/src/aliases.mts";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin, type UserConfig } from "vite";

export const ALIASES = {
  "#scripts": fileURLToPath(new URL("../../scripts", import.meta.url)),
  "#kit": fileURLToPath(new URL("../../curriculum/_kit", import.meta.url)),
  util: fileURLToPath(new URL("src/runner/ts/node/util.ts", import.meta.url))
};
const APP_SOURCE_DIR = fileURLToPath(new URL("src", import.meta.url));
const APP_DIR = fileURLToPath(new URL(".", import.meta.url));
const APP_ALIAS_PREFIX = "@/";
const DEPENDENCIES_DIR = "/node_modules/";
const WORKER_FILE_NAMES = `${WORKERS_DIR_NAME}/[name]-[hash].js`;
export const WORKER_CONFIG = {
  format: "es",
  plugins: () => [appSourceAlias()],
  rolldownOptions: {
    output: {
      entryFileNames: WORKER_FILE_NAMES,
      chunkFileNames: WORKER_FILE_NAMES
    }
  }
} satisfies UserConfig["worker"];
const OUT_DIR = fileURLToPath(new URL("dist-client", import.meta.url));
const DEV_SERVER_ORIGIN = "http://localhost:8090";
const VSCODE_CSS = /node_modules[/\\].*(@codingame[/\\]monaco-vscode|vscode|monaco-editor).*\.css$/;
const INLINE_QUERY = "?inline";
const BUILD_TARGET = "esnext";
const CHUNK_SIZE_WARNING_KB = 100_000;
const NO_INLINED_ASSETS = 0;
const DEDUPED_PACKAGES = ["vscode", "monaco-editor"];
const APP_VERSION = new Date().toISOString();

function appVersion(): Plugin {
  return {
    name: "interview-prep-app-version",
    config: () => ({
      define: {
        __APP_VERSION__: JSON.stringify(APP_VERSION)
      }
    }),
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: VERSION_FILE_NAME,
        source: JSON.stringify({ version: APP_VERSION })
      });
    }
  };
}

function posixPath(path: string) {
  return path.replaceAll("\\", "/");
}

function isAppImporter(importer: string | undefined) {
  if (importer === undefined) {
    return false;
  }

  const path = posixPath(importer);
  return path.startsWith(posixPath(APP_DIR)) && !path.includes(DEPENDENCIES_DIR);
}

export function appSourceAlias(): Plugin {
  return {
    name: "interview-prep-app-alias",
    enforce: "pre",
    resolveId(source, importer, options) {
      if (!source.startsWith(APP_ALIAS_PREFIX) || !isAppImporter(importer)) {
        return null;
      }

      return this.resolve(`${APP_SOURCE_DIR}/${source.slice(APP_ALIAS_PREFIX.length)}`, importer, options);
    }
  };
}

function inlineVscodeCss(): Plugin {
  return {
    name: "interview-prep-inline-vscode-css",
    enforce: "pre",
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, options);
      if (!resolved || !VSCODE_CSS.test(resolved.id)) {
        return null;
      }

      return {
        ...resolved,
        id: `${resolved.id}${INLINE_QUERY}`
      };
    }
  };
}

export default defineConfig({
  plugins: [extensionSourceAliases(), appSourceAlias(), inlineVscodeCss(), appVersion()],
  resolve: {
    alias: ALIASES,
    dedupe: DEDUPED_PACKAGES
  },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    assetsDir: HASHED_ASSETS_DIR_NAME,
    target: BUILD_TARGET,
    assetsInlineLimit: NO_INLINED_ASSETS,
    chunkSizeWarningLimit: CHUNK_SIZE_WARNING_KB
  },
  worker: WORKER_CONFIG,
  server: {
    proxy: {
      [COURSE_PATH]: DEV_SERVER_ORIGIN,
      [API_PATH]: DEV_SERVER_ORIGIN,
      [RUNNER_PATH]: DEV_SERVER_ORIGIN
    }
  }
});
