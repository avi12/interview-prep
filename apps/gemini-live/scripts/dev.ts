import { readToken, trainerUrl } from "../../../scripts/lib/trainer-url.ts";
import { resolveVscodeOrigin } from "../vscode-origin.ts";
import { launchChrome, reloadPages } from "./dev-browser.ts";
import { fingerprintOutput, planReload, type ReloadPlan } from "./dev-output.ts";
import { watch } from "chokidar";
import { relative, resolve } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { build } from "wxt";

const PACKAGE_DIR = resolve(import.meta.dirname, "..");
const WATCHED_PATHS = [
  "src",
  "public",
  "wxt.config.ts",
  "aliases.ts",
  "extension-identity.ts",
  "vscode-origin.ts",
  "../../scripts/lib"
].map(path => resolve(PACKAGE_DIR, path));
const BUILD_MODE = "development";
const BUILD_BROWSER = "chrome";
const MANIFEST_VERSION = 3;
const REBUILD_DEBOUNCE_MS = 800;
const WATCH_POLL_MS = 500;
const TRANSIENT_FS_ERROR = /EPERM|EBUSY/;
const MAX_BUILD_ATTEMPTS = 3;
const BUILD_RETRY_DELAY_MS = 300;
const EXIT_GRACE_MS = 3000;

function logEvent(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function buildOnce() {
  let outDir = "";
  await build({
    root: PACKAGE_DIR,
    mode: BUILD_MODE,
    browser: BUILD_BROWSER,
    manifestVersion: MANIFEST_VERSION,
    hooks: {
      "build:done"(wxt) {
        outDir = wxt.config.outDir;
      }
    }
  });
  return outDir;
}

async function buildExtension() {
  for (let attempt = 1; ; attempt++) {
    try {
      return await buildOnce();
    } catch (error) {
      const isRetryable = TRANSIENT_FS_ERROR.test(String(error)) && attempt < MAX_BUILD_ATTEMPTS;
      if (!isRetryable) {
        throw error;
      }

      logEvent(`Build hit a locked file (attempt ${attempt} of ${MAX_BUILD_ATTEMPTS}), retrying`);
      await wait(BUILD_RETRY_DELAY_MS);
    }
  }
}

function startUrl() {
  const origin = resolveVscodeOrigin();
  const token = readToken();
  return token ? trainerUrl({
    origin,
    token
  }) : origin;
}

process.chdir(PACKAGE_DIR);
logEvent("Building the extension (development)");
const outDir = await buildExtension();
let loadedOutput = fingerprintOutput(outDir);
const { runner, debugPort, chromiumBinary } = await launchChrome({
  sourceDir: outDir,
  startUrl: startUrl()
});
logEvent(`Chrome for Testing is running the extension from ${outDir}`);
logEvent(`Browser: ${chromiumBinary}, debugging port ${debugPort}`);

async function applyReload(plan: ReloadPlan) {
  if (plan.isExtensionChanged) {
    await runner.reloadAllExtensions();
  }

  return reloadPages({
    debugPort,
    tabPatterns: plan.tabPatterns,
    isExtensionPageIncluded: plan.isPageChanged
  });
}

async function rebuildAndReload(changedPath: string) {
  const startedAt = Date.now();
  logEvent(`${relative(PACKAGE_DIR, changedPath)} changed, rebuilding`);
  await buildExtension();
  const nextOutput = fingerprintOutput(outDir);
  const plan = planReload({
    outDir,
    before: loadedOutput,
    after: nextOutput
  });
  loadedOutput = nextOutput;

  if (!plan.isChanged) {
    logEvent(`No output changed (${Date.now() - startedAt} ms), nothing to reload`);
    return;
  }

  const reloaded = await applyReload(plan);
  const extensionNote = plan.isExtensionChanged ? "the extension and " : "";
  const pagesNote = reloaded.length ? reloaded.join(", ") : "no open pages";
  logEvent(`Reloaded ${extensionNote}${pagesNote} (${Date.now() - startedAt} ms)`);
}

let isRebuilding = false;
let pendingPath: string | null = null;
let debounceTimer: NodeJS.Timeout | undefined;

async function drainRebuilds() {
  if (isRebuilding) {
    return;
  }

  isRebuilding = true;
  while (pendingPath !== null) {
    const changedPath = pendingPath;
    pendingPath = null;
    await rebuildAndReload(changedPath).catch(error => {
      logEvent("Rebuild failed, waiting for the next change:");
      console.error(error);
    });
  }
  isRebuilding = false;
}

function scheduleRebuild(changedPath: string) {
  pendingPath = changedPath;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void drainRebuilds(), REBUILD_DEBOUNCE_MS);
}

const watcher = watch(WATCHED_PATHS, {
  ignoreInitial: true,
  usePolling: true,
  interval: WATCH_POLL_MS
});
watcher.on("all", (_event, changedPath) => scheduleRebuild(changedPath));
watcher.on("error", error => {
  logEvent("Watcher error:");
  console.error(error);
});
logEvent("Watching for changes. Close Chrome for Testing or press Ctrl+C to stop");

let isExiting = false;

async function exit() {
  if (isExiting) {
    return;
  }

  isExiting = true;
  logEvent("Stopping the watcher and Chrome for Testing");
  setTimeout(() => process.exit(0), EXIT_GRACE_MS).unref();
  await watcher.close();
  await runner.exit();
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => void exit());
}
runner.registerCleanup(() => void exit());
