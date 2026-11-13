import { MAX_SOCKET_ATTEMPTS } from "@server/narration-stream.ts";
import {
  createFakeEdgeTts,
  createTestApp,
  ENGLISH_CARD,
  ENGLISH_SPOKEN_TEXT,
  FAKE_AUDIO_CHUNKS,
  FAKE_VOICES,
  FAKE_WORD_SECONDS,
  HEBREW_CARD,
  KNOWN_LESSON,
  OTHER_LESSON
} from "@server/test-fixture.ts";
import { describe, expect, it } from "vitest";

import { DEFAULT_VOICE } from "#scripts/lib/edge-tts/constants.ts";
import {
  decodeFrames,
  FrameKind,
  NARRATE_STREAM_CONTENT_TYPE,
  NARRATE_STREAM_PATH,
  NARRATE_VOICES_PATH,
  NarrateQuery,
  type NarrationFrame
} from "#scripts/lib/narration-stream.ts";

const FAILED_ATTEMPTS_BEFORE_SUCCESS = 2;
const HEBREW_VOICES = ["he-IL-HilaNeural", "he-IL-AvriNeural"];

function streamUrl({ lesson, card, voice }: { lesson: string; card: number; voice?: string }) {
  const query = new URLSearchParams({
    [NarrateQuery.LESSON]: lesson,
    [NarrateQuery.CARD]: String(card)
  });
  if (voice !== undefined) {
    query.set(NarrateQuery.VOICE, voice);
  }

  return `${NARRATE_STREAM_PATH}?${query}`;
}

async function framesOf(response: Response) {
  if (response.body === null) {
    throw new Error("The response has no body");
  }

  const frames: NarrationFrame[] = [];
  for await (const frame of decodeFrames(response.body)) {
    frames.push(frame);
  }

  return frames;
}

describe("narration voices", () => {
  it("lists the voices as JSON without caching", async () => {
    const { app } = createTestApp();
    const response = await app.request(NARRATE_VOICES_PATH);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(FAKE_VOICES);
  });
});

describe("narration stream", () => {
  it("streams meta first, then audio and word frames, with no-store and security headers", async () => {
    const { app } = createTestApp();
    const response = await app.request(
      streamUrl({
        lesson: KNOWN_LESSON,
        card: ENGLISH_CARD
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(NARRATE_STREAM_CONTENT_TYPE);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-security-policy")).toContain("connect-src 'self'");
    const frames = await framesOf(response);
    expect(frames[0]).toEqual({
      kind: FrameKind.META,
      voice: DEFAULT_VOICE,
      locale: "en-US",
      mimeType: "audio/mpeg",
      text: ENGLISH_SPOKEN_TEXT,
      cues: [
        {
          name: "intro",
          start: ENGLISH_SPOKEN_TEXT.indexOf("brave")
        }
      ]
    });
    const audio = frames.filter(frame => frame.kind === FrameKind.AUDIO).map(frame => [...frame.bytes]);
    expect(audio).toEqual(FAKE_AUDIO_CHUNKS);
    const words = frames.filter(frame => frame.kind === FrameKind.WORD);
    expect(words).toEqual([
      {
        kind: FrameKind.WORD,
        offsetSeconds: 0,
        textStart: 0,
        textLength: 5
      },
      {
        kind: FrameKind.WORD,
        offsetSeconds: FAKE_WORD_SECONDS,
        textStart: 6,
        textLength: 5
      },
      {
        kind: FrameKind.WORD,
        offsetSeconds: FAKE_WORD_SECONDS * 2,
        textStart: 12,
        textLength: 5
      }
    ]);
  });

  it("speaks a Hebrew card with a Hebrew voice", async () => {
    const { app } = createTestApp();
    const frames = await framesOf(
      await app.request(
        streamUrl({
          lesson: KNOWN_LESSON,
          card: HEBREW_CARD
        })
      )
    );
    const [meta] = frames;
    expect(meta?.kind === FrameKind.META && HEBREW_VOICES.includes(meta.voice)).toBe(true);
    expect(meta?.kind === FrameKind.META && meta.locale).toBe("he-IL");
  });

  it("honours a known voice and rejects an unknown one", async () => {
    const { app } = createTestApp();
    const known = await framesOf(
      await app.request(
        streamUrl({
          lesson: KNOWN_LESSON,
          card: ENGLISH_CARD,
          voice: HEBREW_VOICES[1]
        })
      )
    );
    expect(known[0]?.kind === FrameKind.META && known[0].voice).toBe(HEBREW_VOICES[1]);
    const unknown = await app.request(
      streamUrl({
        lesson: KNOWN_LESSON,
        card: ENGLISH_CARD,
        voice: "xx-XX-NobodyNeural"
      })
    );
    expect(unknown.status).toBe(404);
  });

  it("answers 404 for an unknown lesson, an unknown card and a malformed query", async () => {
    const { app } = createTestApp();
    const urls = [
      streamUrl({
        lesson: "nope/01-missing",
        card: ENGLISH_CARD
      }),
      streamUrl({
        lesson: OTHER_LESSON,
        card: ENGLISH_CARD
      }),
      streamUrl({
        lesson: KNOWN_LESSON,
        card: 99
      }),
      `${NARRATE_STREAM_PATH}?${NarrateQuery.LESSON}=${KNOWN_LESSON}&${NarrateQuery.CARD}=abc`,
      NARRATE_STREAM_PATH
    ];
    for (const url of urls) {
      expect((await app.request(url)).status).toBe(404);
    }
  });

  it("never synthesizes free text from the query", async () => {
    const { edgeTts, calls } = createFakeEdgeTts();
    const { app } = createTestApp({ edgeTts });
    const response = await app.request(
      `${NARRATE_STREAM_PATH}?text=say+anything&${NarrateQuery.LESSON}=${KNOWN_LESSON}`
    );
    expect(response.status).toBe(404);
    await app.request(
      `${streamUrl({
        lesson: KNOWN_LESSON,
        card: ENGLISH_CARD
      })}&text=say+anything`
    );
    expect(calls.map(call => call.text)).toEqual([ENGLISH_SPOKEN_TEXT]);
  });

  it("retries the socket while no audio was sent", async () => {
    const { edgeTts, calls } = createFakeEdgeTts({ failedAttempts: FAILED_ATTEMPTS_BEFORE_SUCCESS });
    const { app } = createTestApp({ edgeTts });
    const frames = await framesOf(
      await app.request(
        streamUrl({
          lesson: KNOWN_LESSON,
          card: ENGLISH_CARD
        })
      )
    );
    expect(calls).toHaveLength(FAILED_ATTEMPTS_BEFORE_SUCCESS + 1);
    expect(frames.filter(frame => frame.kind === FrameKind.AUDIO)).toHaveLength(FAKE_AUDIO_CHUNKS.length);
  });

  it("gives up after three refused sockets and logs it", async () => {
    const { edgeTts, calls } = createFakeEdgeTts({ failedAttempts: MAX_SOCKET_ATTEMPTS });
    const { app, logs } = createTestApp({ edgeTts });
    const response = await app.request(
      streamUrl({
        lesson: KNOWN_LESSON,
        card: ENGLISH_CARD
      })
    );
    await expect(framesOf(response)).rejects.toThrow();
    expect(calls).toHaveLength(MAX_SOCKET_ATTEMPTS);
    expect(logs.some(entry => entry.severity === "ERROR")).toBe(true);
  });

  it("stops synthesizing when the client disconnects", async () => {
    let isAborted = false;
    const { edgeTts } = createFakeEdgeTts();
    const { app } = createTestApp({
      edgeTts: {
        listVoices: edgeTts.listVoices,
        synthesize: ({ signal }) =>
          new Promise<void>(() => {
            signal.addEventListener("abort", () => {
              isAborted = true;
            });
          })
      }
    });
    const response = await app.request(
      streamUrl({
        lesson: KNOWN_LESSON,
        card: ENGLISH_CARD
      })
    );
    await response.body?.cancel();
    expect(isAborted).toBe(true);
  });
});

describe("narration rate limit", () => {
  it("returns 429 once an address has used its budget, per address", async () => {
    let now = 0;
    const { app } = createTestApp({
      narrateRateLimit: {
        capacity: 2,
        refillPerSecond: 1,
        now: () => now
      }
    });
    const statuses: number[] = [];
    for (let iRequest = 0; iRequest < 3; iRequest++) {
      statuses.push(
        (
          await app.request(NARRATE_VOICES_PATH, {
            headers: {
              "x-forwarded-for": "1.1.1.1"
            }
          })
        ).status
      );
    }
    expect(statuses).toEqual([200, 200, 429]);
    expect(
      (
        await app.request(NARRATE_VOICES_PATH, {
          headers: {
            "x-forwarded-for": "2.2.2.2"
          }
        })
      ).status
    ).toBe(200);
    now = 1000;
    expect(
      (
        await app.request(NARRATE_VOICES_PATH, {
          headers: {
            "x-forwarded-for": "1.1.1.1"
          }
        })
      ).status
    ).toBe(200);
  });
});
