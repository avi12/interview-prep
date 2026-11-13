import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { createApp } from "@server/app.ts";
import type { EdgeTts } from "@server/edge-tts/service.ts";
import type { LogEntry } from "@server/logging.ts";
import { createMemoryProgressStore } from "@server/memory-progress-store.ts";
import type { RateLimitOptions } from "@server/rate-limit.ts";

import type { Voice } from "#scripts/lib/edge-tts/voice.ts";
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
export const ENGLISH_CARD = 1;
export const HEBREW_CARD = 2;
const ENGLISH_SCRIPT = "Hello [[intro]] brave world";
export const ENGLISH_SPOKEN_TEXT = "Hello brave world";
const HEBREW_SCRIPT = "שלום עולם";
export const FAKE_AUDIO_CHUNKS = [
  [1, 2, 3],
  [4, 5]
];
export const FAKE_WORD_SECONDS = 0.5;
export const FAKE_VOICES: Voice[] = [
  ["en-US-AriaNeural", "en-US", "Female"],
  ["he-IL-HilaNeural", "he-IL", "Female"],
  ["he-IL-AvriNeural", "he-IL", "Male"]
].map(([ShortName = "", Locale = "", Gender = ""]) => ({
  ShortName,
  Locale,
  Gender,
  FriendlyName: ShortName,
  LocaleName: Locale
}));

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
    narration: `dist/lessons/${id}.narration.json`,
    sqlTables: []
  };
}

const FIXTURE_CARDS = [
  {
    card: ENGLISH_CARD,
    title: "English card",
    script: ENGLISH_SCRIPT
  },
  {
    card: HEBREW_CARD,
    title: "Hebrew card",
    script: HEBREW_SCRIPT
  }
];

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
  for (const [id, cards] of [
    [KNOWN_LESSON, FIXTURE_CARDS],
    [OTHER_LESSON, []]
  ] as const) {
    writeDeep({
      path: join(contentRoot, "dist", "lessons", `${id}.narration.json`),
      content: JSON.stringify(cards)
    });
  }
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

export function createFakeEdgeTts({ failedAttempts = 0 }: { failedAttempts?: number } = {}) {
  const calls: {
    text: string;
    voice: string;
  }[] = [];
  const edgeTts: EdgeTts = {
    listVoices: async () => FAKE_VOICES,
    async synthesize({ text, voice, onAudio, onWordBoundary }) {
      calls.push({
        text,
        voice
      });

      if (calls.length <= failedAttempts) {
        throw new Error("The Read Aloud service refused the connection");
      }

      for (const [iWord, word] of text.split(" ").entries()) {
        onWordBoundary({
          time: iWord * FAKE_WORD_SECONDS,
          duration: FAKE_WORD_SECONDS,
          text: word
        });
      }

      for (const chunk of FAKE_AUDIO_CHUNKS) {
        onAudio(new Uint8Array(chunk));
      }
    }
  };
  return {
    edgeTts,
    calls
  };
}

export function createTestApp({
  rateLimit,
  narrateRateLimit,
  edgeTts = createFakeEdgeTts().edgeTts
}: {
  rateLimit?: RateLimitOptions;
  narrateRateLimit?: RateLimitOptions;
  edgeTts?: EdgeTts;
} = {}) {
  const logs: LogEntry[] = [];
  const app = createApp({
    verifyIdToken: fakeVerifier,
    progressStore: createMemoryProgressStore(),
    ...writeFixtureTree(),
    log: entry => logs.push(entry),
    rateLimit,
    narrateRateLimit,
    edgeTts
  });
  return {
    app,
    logs
  };
}

export function authorized(token = VALID_TOKEN) {
  return { authorization: `Bearer ${token}` };
}
