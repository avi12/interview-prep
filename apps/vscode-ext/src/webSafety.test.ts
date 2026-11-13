import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveSourceAlias, SOURCE_ALIASES } from "@/aliases.mts";

const WEB_ENTRIES = ["web.ts"];
const NODE_SCHEME = "node:";
const PACKAGE_IMPORTS: Record<string, string> = { "#scripts/": `${SOURCE_ALIASES["@scripts"]}/` };
const BROWSER_SAFE_PACKAGES = new Set(["vscode", "zod"]);
const IMPORT_SPECIFIER = /^\s*(?:import|export)\s(?:[^"';]*?\sfrom\s)?["']([^"']+)["']/gm;
const BUILTINS = new Set(builtinModules);
const NODE_HOST_MODULES = ["extension.ts", "nodeHost.ts", "localFeatures.ts", "lessonCli.ts"];

function specifiersOf(path: string) {
  return [...readFileSync(path, "utf8").matchAll(IMPORT_SPECIFIER)].map(([, specifier]) => specifier);
}

function resolveLocal({ specifier, importer }: { specifier: string; importer: string }) {
  const aliased = resolveSourceAlias(specifier);
  if (aliased) {
    return aliased;
  }

  for (const [prefix, target] of Object.entries(PACKAGE_IMPORTS)) {
    if (specifier.startsWith(prefix)) {
      return `${target}${specifier.slice(prefix.length)}`;
    }
  }

  return specifier.startsWith(".") ? resolve(dirname(importer), specifier) : null;
}

function isNodeOnly(specifier: string) {
  return specifier.startsWith(NODE_SCHEME) || BUILTINS.has(specifier);
}

function webImportGraph() {
  const seen = new Set<string>();
  const nodeImports: string[] = [];
  const packages = new Set<string>();
  const pending = WEB_ENTRIES.map(entry => resolve(SOURCE_ALIASES["@"], entry));
  for (let path = pending.pop(); path; path = pending.pop()) {
    const isSeenOrJson = seen.has(path) || path.endsWith(".json");
    if (isSeenOrJson) {
      continue;
    }

    seen.add(path);
    for (const specifier of specifiersOf(path)) {
      if (isNodeOnly(specifier)) {
        nodeImports.push(`${path} imports ${specifier}`);
        continue;
      }

      const local = resolveLocal({
        specifier,
        importer: path
      });
      if (local) {
        pending.push(resolve(local));
      } else {
        packages.add(specifier);
      }
    }
  }
  return {
    files: seen,
    nodeImports,
    packages
  };
}

describe("web entry", () => {
  const graph = webImportGraph();
  const names = [...graph.files].map(path => path.replaceAll("\\", "/").split("/").at(-1));

  it("reaches the shared core", () => {
    expect(names).toEqual(
      expect.arrayContaining(["activateCourse.ts", "lessonTree.ts", "testResults.ts", "webHost.ts"])
    );
  });

  it("imports nothing that needs Node", () => {
    expect(graph.nodeImports).toEqual([]);
  });

  it("imports only browser-safe packages", () => {
    expect([...graph.packages].filter(name => !BROWSER_SAFE_PACKAGES.has(name))).toEqual([]);
  });

  it("leaves the Node host out", () => {
    for (const nodeModule of NODE_HOST_MODULES) {
      expect(names).not.toContain(nodeModule);
    }
  });
});
