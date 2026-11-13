import * as runner from "@vitest/runner";
import * as pathe from "pathe";

import { EnginePath, PgliteFile } from "#scripts/lib/runner-bundle.ts";
import { zod } from "@/lib/zod.ts";
import { engineUrl } from "@/runner/engine-url.ts";
import { chai, createExpect } from "@/runner/ts/expect.ts";
import { nodeBuffer } from "@/runner/ts/node/buffer.ts";
import { nodeCrypto } from "@/runner/ts/node/crypto.ts";
import { nodeFs, promises } from "@/runner/ts/node/fs.ts";
import { fileURLToPath, nodeUrl } from "@/runner/ts/node/url.ts";
import { nodeUtil } from "@/runner/ts/node/util.ts";
import { createVi } from "@/runner/ts/vi.ts";

type ModuleRecord = Record<string, unknown>;
type Loader = () => ModuleRecord | Promise<ModuleRecord>;
type Swap = (module: ModuleRecord) => void;
type ModuleLoaders = Record<string, () => Promise<ModuleRecord>>;
type PgliteConstructor = new (...args: unknown[]) => { waitReady: Promise<void> };

export const HOST_GLOBAL = "__runnerHost";
const VITEST_MODULE = "vitest";
const NODE_PREFIX = "node:";
const ZOD_MODULE = "zod";
const PGLITE_MODULE = "@electric-sql/pglite";
const BARE_NODE_MODULES = new Set(["fs", "fs/promises", "path", "url", "util", "crypto", "buffer"]);
const MODULE_NOT_FOUND = "ERR_MODULE_NOT_FOUND";

const RUNNER_EXPORTS = {
  describe: runner.describe,
  suite: runner.suite,
  it: runner.it,
  test: runner.test,
  beforeAll: runner.beforeAll,
  afterAll: runner.afterAll,
  beforeEach: runner.beforeEach,
  afterEach: runner.afterEach,
  onTestFailed: runner.onTestFailed,
  onTestFinished: runner.onTestFinished
};

const pgliteModuleSchema = zod.looseObject({
  PGlite: zod.custom<PgliteConstructor>(value => typeof value === "function")
});

export function hostNameOf(specifier: string) {
  return BARE_NODE_MODULES.has(specifier) ? `${NODE_PREFIX}${specifier}` : specifier;
}

function pgliteFileUrl(name: string) {
  return engineUrl(`${EnginePath.PGLITE_DIR}/${name}`);
}

async function loadPglite() {
  const [module, pgliteWasmModule, initdbWasmModule, fsBundle] = await Promise.all([
    import(/* @vite-ignore */ pgliteFileUrl(PgliteFile.MODULE).href),
    WebAssembly.compileStreaming(fetch(pgliteFileUrl(PgliteFile.WASM))),
    WebAssembly.compileStreaming(fetch(pgliteFileUrl(PgliteFile.INITDB_WASM))),
    fetch(pgliteFileUrl(PgliteFile.FS_BUNDLE)).then(response => response.blob())
  ]);
  const parsed = pgliteModuleSchema.safeParse(module);
  if (!parsed.success) {
    throw new Error("The database engine did not load");
  }

  const originalPglite = parsed.data.PGlite;
  const engineAssets = {
    pgliteWasmModule,
    initdbWasmModule,
    fsBundle
  };
  function withAssets(dataDirOrOptions?: unknown, options?: object) {
    return {
      ...engineAssets,
      ...(typeof dataDirOrOptions === "string" ? { dataDir: dataDirOrOptions } : (dataDirOrOptions ?? {})),
      ...options
    };
  }

  class PGlite extends originalPglite {
    constructor(dataDirOrOptions?: unknown, options?: object) {
      super(withAssets(dataDirOrOptions, options));
    }

    static async create(dataDirOrOptions?: unknown, options?: object) {
      const database = new PGlite(dataDirOrOptions, options);
      await database.waitReady;
      return database;
    }
  }

  return {
    ...parsed.data,
    PGlite
  };
}

export function createHost() {
  const expect = createExpect();
  const loaders: Record<string, Loader> = {
    [ZOD_MODULE]: () => ({
      ...zod,
      zod,
      default: zod
    }),
    "node:fs": () => nodeFs,
    "node:fs/promises": () => ({
      ...promises,
      default: promises
    }),
    "node:path": () => ({
      ...pathe,
      default: pathe,
      posix: pathe
    }),
    "node:url": () => nodeUrl,
    "node:util": () => nodeUtil,
    "node:crypto": () => nodeCrypto,
    "node:buffer": () => nodeBuffer,
    [PGLITE_MODULE]: loadPglite
  };
  const originals = new Map<string, ModuleRecord>();
  const scopes = new Map<string, ReturnType<typeof createScope>>();
  let activeBundleId = "";

  async function load(name: string) {
    const cached = originals.get(name);
    if (cached) {
      return cached;
    }

    const loader = loaders[name];
    if (!loader) {
      throw new Error(`${name} is not available when tests run in the browser`);
    }

    const module = await loader();
    originals.set(name, module);
    return module;
  }

  function createScope() {
    const overrides = new Map<string, ModuleRecord>();
    const swaps = new Map<string, Set<Swap>>();
    const pendingMocks: Promise<void>[] = [];
    let moduleLoaders: ModuleLoaders = {};
    const viApi = createVi({
      mockModule({ specifier, factory }) {
        const name = hostNameOf(specifier);
        if (!(name in loaders)) {
          throw new Error(`vi.mock("${specifier}") is only supported for built-in modules in the browser runner`);
        }

        pendingMocks.push(
          (async () => {
            const mocked = await factory(() => load(name));
            overrides.set(name, mocked);
            for (const swap of swaps.get(name) ?? []) {
              swap(mocked);
            }
          })()
        );
      }
    });
    const vitest = {
      ...RUNNER_EXPORTS,
      expect,
      vi: viApi,
      vitest: viApi,
      assert: chai.assert,
      chai
    };
    return {
      module: (name: string) => overrides.get(name) ?? (name === VITEST_MODULE ? vitest : originals.get(name)),
      onSwap({ name, swap }: { name: string; swap: Swap }) {
        const set = swaps.get(name) ?? new Set<Swap>();
        set.add(swap);
        swaps.set(name, set);
      },
      setModuleLoaders(loadersOfBundle: ModuleLoaders) {
        moduleLoaders = loadersOfBundle;
      },
      async importPath(specifier: string) {
        await Promise.all(pendingMocks);
        const path = specifier.startsWith("file:") ? fileURLToPath(specifier) : specifier;
        const loader = moduleLoaders[path];
        if (!loader) {
          throw Object.assign(new Error(`Cannot find module '${path}'`), { code: MODULE_NOT_FOUND });
        }

        return loader();
      },
      exportNames: (name: string) => Object.keys(name === VITEST_MODULE ? vitest : (originals.get(name) ?? {}))
    };
  }

  function scope(bundleId: string) {
    const existing = scopes.get(bundleId);
    if (existing) {
      return existing;
    }

    const created = createScope();
    scopes.set(bundleId, created);
    return created;
  }

  return {
    isHostModule(specifier: string) {
      const name = hostNameOf(specifier);
      return name === VITEST_MODULE || name in loaders || name.startsWith(NODE_PREFIX);
    },
    async load(specifier: string) {
      const name = hostNameOf(specifier);
      const isNotVitestModule = name !== VITEST_MODULE;
      if (isNotVitestModule) {
        await load(name);
      }
    },
    scope,
    activate(bundleId: string) {
      activeBundleId = bundleId;
    },
    activeScope: () => scope(activeBundleId)
  };
}

export type Host = ReturnType<typeof createHost>;
