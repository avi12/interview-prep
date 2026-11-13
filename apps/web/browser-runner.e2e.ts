import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";
import { createApp } from "@server/app.ts";
import { createMemoryProgressStore } from "@server/memory-progress-store.ts";
import { chromium } from "playwright-core";
import { build } from "vite";
import { expect, it } from "vitest";

import { readTextTree } from "#scripts/lib/files.ts";
import { RUNNER_KIT_FILE_NAME } from "#scripts/lib/layout.ts";
import { readLessons } from "#scripts/lib/lessons.ts";
import { ROOT, RUNNER_DIST_DIR } from "#scripts/lib/paths.ts";
import { EnginePath, isRunnableLang, RunnableLang, RunnerDir } from "#scripts/lib/runner-bundle.ts";
import { formatTable } from "#scripts/lib/text-table.ts";
import { WORKERS_DIR_NAME } from "@/lib/web-paths.ts";

import {
  HARNESS_DATA_FILE,
  HARNESS_STATE_KEY,
  type HarnessData,
  type HarnessLesson,
  type HarnessRow,
  harnessStateSchema,
  ONLY_PARAM,
  Variant
} from "./test/browser-runner/harness-protocol.ts";
import { ALIASES, appSourceAlias, WORKER_CONFIG } from "./vite.config.ts";

const HARNESS_DIR = fileURLToPath(new URL("test/browser-runner", import.meta.url));
const HEADLESS_SHELL_PREFIX = "chromium_headless_shell-";
const HEADLESS_SHELL_FILE = /chrome-headless-shell(\.exe)?$/;
const WHITESPACE = /\s+/g;
const CHROME_ENV = "BROWSER_RUNNER_CHROME";
const ONLY_ENV = "BROWSER_RUNNER_ONLY";
const LOOPBACK = "127.0.0.1";
const POLL_MS = 1000;
const HARNESS_TIMEOUT_MS = 60 * 60 * 1000;
const CSP_MESSAGE = "Content Security Policy";
const MAX_SHOWN_PROBLEM = 90;
const HANGING_SOURCES = {
  [RunnableLang.ts]: {
    lessonId: "foundations/01-two-sum",
    files: {
      "twoSum.ts": "export function twoSum() {\n  while (true) {}\n}\n"
    }
  },
  [RunnableLang.py]: {
    lessonId: "foundations/06-binary-search",
    files: {
      "binary_search.py": "def search(numbers, target):\n    while True:\n        pass\n"
    }
  }
} as const;

function harnessData() {
  const lessons: HarnessLesson[] = [];
  for (const lesson of readLessons()) {
    const { lang } = lesson.meta;
    const isNotRunnableExercise = !lesson.hasExercise || !isRunnableLang(lang);
    if (isNotRunnableExercise) {
      continue;
    }

    lessons.push({
      id: lesson.id,
      lang,
      starter: readTextTree(resolve(lesson.dir, RunnerDir.starter)),
      solution: readTextTree(resolve(lesson.dir, "solution"))
    });
  }
  return {
    lessons,
    hangingFiles: HANGING_SOURCES
  } satisfies HarnessData;
}

function newestHeadlessShell() {
  const expected = chromium.executablePath();
  if (existsSync(expected)) {
    return expected;
  }

  const browsersDir = dirname(dirname(dirname(expected)));
  const installed = existsSync(browsersDir) ? readdirSync(browsersDir) : [];
  const shells = installed.filter(name => name.startsWith(HEADLESS_SHELL_PREFIX)).sort();
  for (const dir of shells.reverse()) {
    const shellDir = resolve(browsersDir, dir);
    const executable = readdirSync(shellDir, {
      recursive: true,
      encoding: "utf8"
    }).find(path => HEADLESS_SHELL_FILE.test(path));
    if (executable) {
      return resolve(shellDir, executable);
    }
  }
  throw new Error(
    `No Chrome found. Set ${CHROME_ENV} or run: pnpm -C apps/web exec playwright-core install chromium-headless-shell`
  );
}

function assertBuilt() {
  for (const path of [RUNNER_KIT_FILE_NAME, EnginePath.ESBUILD_WASM, EnginePath.PYODIDE_DIR, EnginePath.PGLITE_DIR]) {
    if (!existsSync(resolve(RUNNER_DIST_DIR, path))) {
      throw new Error(`Missing ${path} in ${RUNNER_DIST_DIR}. Run: pnpm build && pnpm build:engines`);
    }
  }
}

async function buildHarness(outDir: string) {
  await build({
    configFile: false,
    logLevel: "warn",
    root: HARNESS_DIR,
    plugins: [appSourceAlias()],
    resolve: {
      alias: ALIASES
    },
    worker: WORKER_CONFIG,
    build: {
      outDir,
      emptyOutDir: true
    }
  });
  writeFileSync(resolve(outDir, HARNESS_DATA_FILE), JSON.stringify(harnessData()));
}

function startServer(clientRoot: string) {
  const app = createApp({
    verifyIdToken: async () => null,
    progressStore: createMemoryProgressStore(),
    clientRoot,
    contentRoot: ROOT,
    log: () => undefined
  });
  let server: ReturnType<typeof serve> | undefined;
  const address = new Promise<AddressInfo>(listening => {
    server = serve(
      {
        fetch: app.fetch,
        port: 0,
        hostname: LOOPBACK
      },
      listening
    );
  });
  return {
    address,
    close: () => server?.close()
  };
}

function readHarnessState(key: string) {
  return Object.getOwnPropertyDescriptor(window, key)?.value;
}

function isHarnessDone(key: string) {
  return Object.getOwnPropertyDescriptor(window, key)?.value?.isDone === true;
}

function shown(text: string) {
  const oneLine = text.replaceAll(WHITESPACE, " ").trim();
  return oneLine.length > MAX_SHOWN_PROBLEM ? `${oneLine.slice(0, MAX_SHOWN_PROBLEM)}…` : oneLine;
}

function outcomeText(row: HarnessRow) {
  if (row.isTimedOut) {
    return "timeout";
  }

  return row.isPass ? "pass" : "fail";
}

function rowKey(row: HarnessRow) {
  return `${row.id} ${row.variant}`;
}

function resultTable(rows: HarnessRow[]) {
  const sorted = [...rows].sort((first, second) => rowKey(first).localeCompare(rowKey(second)));
  return formatTable({
    columns: ["Lesson", "Lang", "Variant", "Result", "Expected", "Tests", "Cases", "Queries", "ms", "Problem"],
    rows: sorted.map(row => {
      const isExpectedFailure = row.isExpected && row.variant !== Variant.STARTER;
      return [
        row.id,
        row.lang,
        row.variant,
        outcomeText(row),
        row.isExpected ? "ok" : "UNEXPECTED",
        `${row.passed}/${row.total}`,
        String(row.testCases),
        String(row.queryResults),
        String(row.ms),
        isExpectedFailure ? "" : shown(row.problem)
      ];
    })
  }).join("\n");
}

it("grades every TypeScript, SQL and Python lesson in a real browser", async () => {
  assertBuilt();
  const outDir = mkdtempSync(join(tmpdir(), "browser-runner-"));
  await buildHarness(outDir);
  expect(
    readdirSync(resolve(outDir, WORKERS_DIR_NAME)).length,
    "test workers are emitted where the worker CSP applies"
  ).toBeGreaterThan(0);
  const server = startServer(outDir);
  const { port } = await server.address;
  const browser = await chromium.launch({
    executablePath: process.env[CHROME_ENV] ?? newestHeadlessShell(),
    headless: true
  });
  const violations: string[] = [];
  const pageErrors: string[] = [];
  try {
    const page = await browser.newPage();
    page.on("console", message => {
      if (message.text().includes(CSP_MESSAGE)) {
        violations.push(message.text());
      }
    });
    page.on("pageerror", error => pageErrors.push(error.message));
    const query = new URLSearchParams({ [ONLY_PARAM]: process.env[ONLY_ENV] ?? "" });
    await page.goto(`http://${LOOPBACK}:${port}/?${query}`);
    await page.waitForFunction(isHarnessDone, HARNESS_STATE_KEY, {
      timeout: HARNESS_TIMEOUT_MS,
      polling: POLL_MS
    });
    const state = harnessStateSchema.parse(await page.evaluate(readHarnessState, HARNESS_STATE_KEY));
    console.log(resultTable(state.rows));
    const unexpected = state.rows.filter(row => !row.isExpected);
    console.log(`${state.rows.length} runs, ${unexpected.length} unexpected, ${violations.length} CSP violations`);
    expect(state.fatal).toBe("");
    expect(pageErrors).toEqual([]);
    expect(violations).toEqual([]);
    expect(unexpected.map(row => `${row.id} ${row.variant}`)).toEqual([]);
  } finally {
    await browser.close();
    server.close();
    rmSync(outDir, {
      recursive: true,
      force: true
    });
  }
});
