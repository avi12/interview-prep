import { escapeRegex } from "../../../scripts/lib/regex.ts";
import { extensionId } from "../extension-identity.ts";
import { type CdpTarget, connect, DEBUG_HOST, listTargets } from "./cdp.ts";
import { CHROME_FOR_TESTING_MISSING, chromeExecutable } from "./chrome-for-testing.ts";
import { rmSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import webExtRun from "web-ext-run";

const PROFILE_DIR = resolve(import.meta.dirname, "..", ".dev-profile");
const SERVICE_WORKER_DIR = join(PROFILE_DIR, "Default", "Service Worker");
const FIRST_DEBUG_PORT = 9455;
const MAX_PORT_PROBES = 50;
const PAGE_TARGET_TYPE = "page";
const MATCH_PATTERN_WILDCARD = "*";
const EXTENSION_ORIGIN = `chrome-extension://${extensionId()}/`;
const CHROME_ARGS = ["--disable-blink-features=AutomationControlled"];

function isPortFree(port: number) {
  return new Promise<boolean>(resolvePort => {
    const server = createServer();
    server.once("error", () => resolvePort(false));
    server.once("listening", () => server.close(() => resolvePort(true)));
    server.listen(port, DEBUG_HOST);
  });
}

async function findFreePort() {
  for (let port = FIRST_DEBUG_PORT; port < FIRST_DEBUG_PORT + MAX_PORT_PROBES; port++) {
    if (await isPortFree(port)) {
      return port;
    }
  }
  throw new Error(`no free debugging port from ${FIRST_DEBUG_PORT}`);
}

export async function launchChrome({ sourceDir, startUrl }: {
  sourceDir: string;
  startUrl: string;
}) {
  const chromiumBinary = chromeExecutable();
  if (!chromiumBinary) {
    throw new Error(CHROME_FOR_TESTING_MISSING);
  }

  const debugPort = await findFreePort();
  rmSync(SERVICE_WORKER_DIR, {
    recursive: true,
    force: true
  });
  const runner = await webExtRun.cmd.run(
    {
      target: ["chromium"],
      sourceDir,
      chromiumBinary,
      chromiumProfile: PROFILE_DIR,
      profileCreateIfMissing: true,
      keepProfileChanges: true,
      startUrl: [startUrl],
      args: [`--remote-debugging-port=${debugPort}`, ...CHROME_ARGS],
      noReload: true,
      noInput: true
    },
    { shouldExitProgram: false }
  );
  return {
    runner,
    debugPort,
    chromiumBinary
  };
}

function matchPatternRegex(pattern: string) {
  return new RegExp(`^${pattern.split(MATCH_PATTERN_WILDCARD).map(escapeRegex).join(".*")}$`);
}

async function reloadTarget({ webSocketDebuggerUrl }: CdpTarget) {
  const cdp = await connect(webSocketDebuggerUrl);
  await cdp.send("Page.reload");
  cdp.close();
}

export async function reloadPages({ debugPort, tabPatterns, isExtensionPageIncluded }: {
  debugPort: number;
  tabPatterns: string[];
  isExtensionPageIncluded: boolean;
}) {
  const tabRegexes = tabPatterns.map(matchPatternRegex);
  const pages = (await listTargets(debugPort)).filter(({ type, url }) => {
    const isExtensionPage = isExtensionPageIncluded && url.startsWith(EXTENSION_ORIGIN);
    return type === PAGE_TARGET_TYPE && (isExtensionPage || tabRegexes.some(regex => regex.test(url)));
  });
  await Promise.allSettled(pages.map(reloadTarget));
  return pages.map(({ url }) => {
    const { protocol, host, pathname } = new URL(url);
    return `${protocol}//${host}${pathname}`;
  });
}
