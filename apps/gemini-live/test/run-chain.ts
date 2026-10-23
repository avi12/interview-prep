import { TUTOR_VIEW_PATH } from "../../../scripts/lib/tutor-view.ts";
import { debugEndpoint } from "../scripts/cdp.ts";
import { CHROME_FOR_TESTING_MISSING, chromeExecutable } from "../scripts/chrome-for-testing.ts";
/*
 * Builds the extension for a throwaway VS Code origin, serves a fake VS Code there, starts
 * Chrome for Testing with that build and a fresh profile, and runs livechain.ts against it.
 * Branded Chrome ignores --load-extension since 137; Chrome for Testing (which puppeteer
 * keeps in ~/.cache/puppeteer/chrome) still honours it. Set CHROME_FOR_TESTING to use another.
 *
 * Only the browser this script started is ever stopped, by its pid.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as wait } from "node:timers/promises";

const PACKAGE_DIR = resolve(import.meta.dirname, "..");
const VSCODE_PORT = Number(process.env.CHAIN_VSCODE_PORT ?? 18765);
const DEBUG_PORT = Number(process.env.CHAIN_DEBUG_PORT ?? 19333);
const VSCODE_ORIGIN = `http://127.0.0.1:${VSCODE_PORT}`;
const UNSERVED_TUTOR_VIEW_URL = `http://127.0.0.1:${VSCODE_PORT + 1}${TUTOR_VIEW_PATH}`;
const OUT_DIR = ".output-test";
const EXTENSION_DIR = resolve(PACKAGE_DIR, OUT_DIR, "chrome-mv3");
const WINDOW_SIZE = "2000,1200";
const BROWSER_READY_TRIES = 100;
const BROWSER_READY_GAP_MS = 200;

async function isBrowserUp() {
  const response = await fetch(`${debugEndpoint(DEBUG_PORT)}/json/version`).catch(() => null);
  return !!response?.ok;
}

const chrome = chromeExecutable();
if (!chrome) {
  console.log(CHROME_FOR_TESTING_MISSING);
  process.exit(2);
}

console.log(`> build for ${VSCODE_ORIGIN}`);
const build = spawnSync("pnpm exec wxt build", {
  cwd: PACKAGE_DIR,
  shell: true,
  encoding: "utf8",
  env: {
    ...process.env,
    VSCODE_ORIGIN,
    TUTOR_VIEW_URL: UNSERVED_TUTOR_VIEW_URL,
    WXT_OUT_DIR: OUT_DIR
  }
});
if (build.status !== 0) {
  console.log(build.stdout, build.stderr);
  process.exit(1);
}

const fakeVscode = readFileSync(resolve(PACKAGE_DIR, "test", "fake-vscode.html"));
const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(fakeVscode);
});
await new Promise<void>(resolveListen => server.listen(VSCODE_PORT, "127.0.0.1", resolveListen));

const profile = mkdtempSync(join(tmpdir(), "gemini-live-chain-"));
console.log(`> ${chrome}`);
const browser = spawn(
  chrome,
  [
    "--headless=new",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    `--disable-extensions-except=${EXTENSION_DIR}`,
    `--load-extension=${EXTENSION_DIR}`,
    `--window-size=${WINDOW_SIZE}`,
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank"
  ],
  { stdio: "ignore" }
);

function stopBrowser() {
  if (browser.pid) {
    spawnSync("taskkill", ["/PID", String(browser.pid), "/T", "/F"], { stdio: "ignore" });
  }
}

let exitCode = 1;
try {
  let isUp = false;
  for (let attempt = 0; attempt < BROWSER_READY_TRIES && !isUp; attempt++) {
    isUp = await isBrowserUp();

    if (!isUp) {
      await wait(BROWSER_READY_GAP_MS);
    }
  }

  if (!isUp) {
    throw new Error("Chrome for Testing did not open its debugging port");
  }

  const chain = spawn(process.execPath, [resolve(PACKAGE_DIR, "test", "livechain.ts"), String(DEBUG_PORT), VSCODE_ORIGIN], { stdio: "inherit" });
  exitCode = await new Promise<number>(resolveExit => chain.on("exit", code => resolveExit(code ?? 1)));
} finally {
  stopBrowser();
  server.close();
  await wait(1000);
  rmSync(profile, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 500
  });
}
process.exit(exitCode);
