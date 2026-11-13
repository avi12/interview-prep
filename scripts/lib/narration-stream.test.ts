import { describe, expect, it } from "vitest";

import { decodeFrames, encodeFrame, FrameKind, type NarrationFrame } from "#scripts/lib/narration-stream.ts";

const FRAMES: NarrationFrame[] = [
  {
    kind: FrameKind.META,
    voice: "en-US-AriaNeural",
    locale: "en-US",
    mimeType: "audio/mpeg",
    text: "Hello brave world",
    cues: [
      {
        name: "intro",
        start: 6
      }
    ]
  },
  {
    kind: FrameKind.AUDIO,
    bytes: new Uint8Array([0, 255, 7, 8, 9])
  },
  {
    kind: FrameKind.WORD,
    offsetSeconds: 0.5,
    textStart: 6,
    textLength: 5
  }
];
const SPLIT_SIZES = [1, 2, 7];
const FRAME_HEADER_BYTES = 5;
const WORD_TAG = 3;
const UNKNOWN_TAG = 99;

function streamOf(chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }

      controller.close();
    }
  });
}

function joined(frames: NarrationFrame[]) {
  const encoded = frames.map(frame => encodeFrame(frame));
  let totalBytes = 0;
  for (const part of encoded) {
    totalBytes += part.byteLength;
  }

  const bytes = new Uint8Array(totalBytes);
  let iWrite = 0;
  for (const part of encoded) {
    bytes.set(part, iWrite);
    iWrite += part.byteLength;
  }

  return bytes;
}

function splitEvery({ bytes, size }: { bytes: Uint8Array; size: number }) {
  const parts: Uint8Array[] = [];
  for (let iStart = 0; iStart < bytes.byteLength; iStart += size) {
    parts.push(bytes.subarray(iStart, iStart + size));
  }

  return parts;
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const frames: NarrationFrame[] = [];
  for await (const frame of decodeFrames(stream)) {
    frames.push(frame);
  }

  return frames;
}

describe("narration frames", () => {
  it("round-trips every frame kind", async () => {
    expect(await collect(streamOf([joined(FRAMES)]))).toEqual(FRAMES);
  });

  it("decodes frames split across reads at any boundary", async () => {
    for (const size of SPLIT_SIZES) {
      const stream = streamOf(
        splitEvery({
          bytes: joined(FRAMES),
          size
        })
      );
      expect(await collect(stream)).toEqual(FRAMES);
    }
  });

  it("rejects a stream that ends inside a frame", async () => {
    const truncated = joined(FRAMES).subarray(0, -1);
    await expect(collect(streamOf([truncated]))).rejects.toThrow();
  });

  it("rejects an unknown tag and an invalid word payload", async () => {
    const unknownTag = joined(FRAMES.slice(1, 2));
    unknownTag[0] = UNKNOWN_TAG;
    await expect(collect(streamOf([unknownTag]))).rejects.toThrow();
    const payload = new TextEncoder().encode(JSON.stringify({ offsetSeconds: -1 }));
    const badWord = new Uint8Array(FRAME_HEADER_BYTES + payload.byteLength);
    badWord[0] = WORD_TAG;
    new DataView(badWord.buffer).setUint32(1, payload.byteLength);
    badWord.set(payload, FRAME_HEADER_BYTES);
    await expect(collect(streamOf([badWord]))).rejects.toThrow();
  });
});
