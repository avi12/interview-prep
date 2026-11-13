import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { createApp } from "@server/app.ts";
import type { LogEntry } from "@server/logging.ts";
import { createMemoryProgressStore } from "@server/memory-progress-store.ts";
import type { RateLimitOptions } from "@server/rate-limit.ts";

import { PAGE_STYLE_PATHS } from "#scripts/lib/layout.ts";

const FIXTURE_LESSON_MINUTES = 10;

export const KNOWN_LESSON = "support/01-help-desk-triage-and-sla";
export const OTHER_LESSON = "sql/01-select-basics";
export const SECRET_TEXT = "top secret outside every root";
export const SPA_HTML = "<!doctype html><html><head><title>Shell</title></head><body>spa</body></html>";
export const LESSON_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>lesson</body></html>';
export const PAGE_STYLE_TEXT = ":root { --bg: black; }";
export const WEBVIEW_HOST_FILE = "assets/index-abc123.html";
export const RUNNER_ENGINE_FILE = "engines/esbuild/esbuild.wasm";
export const WORKER_FILE = "workers/worker-abc123.js";
export const VALID_TOKEN = "valid.token-value_1";
export const OTHER_TOKEN = "other.token-value_2";

const TOKEN_UIDS: Record<string, string> = {
  [VALID_TOKEN]: "uid-1",
  [OTHER_TOKEN]: "uid-2"
};

function writeDeep({ path, content }: { path: string; content: string }) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function lessonEntry(id: string) {
  return {
    id,
    track: id.split("/")[0],
    title: `Title of ${id}`,
    minutes: FIXTURE_LESSON_MINUTES,
    lang: "none",
    roles: [],
    files: [],
    hasExercise: false,
    html: `dist/lessons/${id}.html`,
    tutor: `dist/lessons/${id}.tutor.json`,
    sqlTables: []
  };
}

function writeFixtureTree() {
  const root = mkdtempSync(join(tmpdir(), "web-server-"));
  const contentRoot = join(root, "content");
  const clientRoot = join(root, "client");
  writeDeep({
    path: join(root, "secret.txt"),
    content: SECRET_TEXT
  });
  writeDeep({
    path: join(contentRoot, "secret.txt"),
    content: SECRET_TEXT
  });
  writeDeep({
    path: join(contentRoot, "dist", "index.json"),
    content: JSON.stringify({
      categories: [],
      tracks: [],
      roles: [],
      orders: {},
      lessons: [lessonEntry(KNOWN_LESSON), lessonEntry(OTHER_LESSON)]
    })
  });
  writeDeep({
    path: join(contentRoot, "dist", "lessons", `${KNOWN_LESSON}.html`),
    content: LESSON_HTML
  });
  writeDeep({
    path: join(clientRoot, "index.html"),
    content: SPA_HTML
  });
  writeDeep({
    path: join(clientRoot, "assets", "app-abc123.js"),
    content: "console.log(1);"
  });
  writeDeep({
    path: join(contentRoot, "dist", "runner", RUNNER_ENGINE_FILE),
    content: "wasm"
  });
  writeDeep({
    path: join(clientRoot, WORKER_FILE),
    content: "self.onmessage = () => undefined;"
  });
  writeDeep({
    path: join(clientRoot, WEBVIEW_HOST_FILE),
    content: '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'">'
  });
  for (const path of PAGE_STYLE_PATHS) {
    writeDeep({
      path: join(contentRoot, path),
      content: PAGE_STYLE_TEXT
    });
  }
  writeDeep({
    path: join(contentRoot, "dist", "runner", "kit.json"),
    content: "{}"
  });
  return {
    contentRoot,
    clientRoot
  };
}

async function fakeVerifier(token: string) {
  return TOKEN_UIDS[token] ?? null;
}

export function createTestApp(rateLimit?: RateLimitOptions) {
  const logs: LogEntry[] = [];
  const app = createApp({
    verifyIdToken: fakeVerifier,
    progressStore: createMemoryProgressStore(),
    ...writeFixtureTree(),
    log: entry => logs.push(entry),
    rateLimit
  });
  return {
    app,
    logs
  };
}

export function authorized(token = VALID_TOKEN) {
  return { authorization: `Bearer ${token}` };
}
