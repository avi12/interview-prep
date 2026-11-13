import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { TRUSTED_CLIENT_TOKEN } from "#scripts/lib/edge-tts/constants.ts";
import { secMsGec } from "#scripts/lib/edge-tts/gec.ts";
import { parseBinaryFrame, parseTextFrame, parseWordBoundaries } from "#scripts/lib/edge-tts/protocol.ts";
import { buildSsml, unescapeXml } from "#scripts/lib/edge-tts/ssml.ts";
import { createWordLocator } from "#scripts/lib/edge-tts/words.ts";

const WINDOWS_EPOCH_OFFSET_SECONDS = 11_644_473_600;
const TICKS_PER_SECOND = 10_000_000n;
const MILLISECONDS_PER_SECOND = 1000;
const ONE_MINUTE_MS = 60_000;
const ONE_MINUTE_ONE_SECOND_MS = 61_000;
const BINARY_HEADER_LENGTH_BYTES = 2;
const AUDIO_BYTES = [7, 8, 9];

describe("secMsGec", () => {
  it("hashes Windows file time rounded down to 5 minutes", async () => {
    const now = Date.UTC(2026, 9, 4, 12, 3, 59);
    const roundedDown = Date.UTC(2026, 9, 4, 12, 0, 0);
    const roundedSeconds = BigInt(roundedDown / MILLISECONDS_PER_SECOND + WINDOWS_EPOCH_OFFSET_SECONDS);
    const expected = createHash("sha256")
      .update(`${roundedSeconds * TICKS_PER_SECOND}${TRUSTED_CLIENT_TOKEN}`)
      .digest("hex")
      .toUpperCase();
    expect(await secMsGec(now)).toBe(expected);
    expect(await secMsGec(now + ONE_MINUTE_MS)).toBe(expected);
    expect(await secMsGec(now + ONE_MINUTE_ONE_SECOND_MS)).not.toBe(expected);
  });
});

describe("buildSsml", () => {
  it("escapes XML and straightens quotes", () => {
    const ssml = buildSsml({
      text: "Tom & “Jerry” <3",
      voice: "en-US-AriaNeural"
    });
    expect(ssml).toContain("Tom &amp; &quot;Jerry&quot; &lt;3");
    expect(ssml).toContain("xml:lang='en-US'");
    expect(ssml).toContain("<voice name='en-US-AriaNeural'>");
  });
});

describe("frames", () => {
  it("parses text frames", () => {
    const frame = parseTextFrame("X-RequestId:abc\r\nPath:turn.end\r\n\r\n{}");
    expect(frame).toMatchObject({
      path: "turn.end",
      body: "{}"
    });
  });

  it("parses binary frames", () => {
    const header = new TextEncoder().encode("Path:audio\r\n");
    const bytes = new Uint8Array(BINARY_HEADER_LENGTH_BYTES + header.length + AUDIO_BYTES.length);
    new DataView(bytes.buffer).setUint16(0, header.length);
    bytes.set(header, BINARY_HEADER_LENGTH_BYTES);
    bytes.set(AUDIO_BYTES, BINARY_HEADER_LENGTH_BYTES + header.length);
    const frame = parseBinaryFrame(bytes.buffer);
    expect(frame.path).toBe("audio");
    expect([...frame.audio]).toEqual(AUDIO_BYTES);
  });

  it("extracts word boundaries in seconds", () => {
    const body = JSON.stringify({
      Metadata: [
        {
          Type: "WordBoundary",
          Data: {
            Offset: 1_000_000,
            Duration: 5_000_000,
            text: {
              Text: "Hi"
            }
          }
        },
        {
          Type: "SessionEnd",
          Data: {}
        }
      ]
    });
    expect(parseWordBoundaries(body)).toEqual([
      {
        time: 0.1,
        duration: 0.5,
        text: "Hi"
      }
    ]);
  });

  it("unescapes words the SSML escaped", () => {
    expect(unescapeXml("&lt;b&gt; &amp; &quot;it&apos;s&quot;")).toBe('<b> & "it\'s"');
  });
});

describe("createWordLocator", () => {
  it("finds each word after the previous one", () => {
    const locate = createWordLocator({ text: "to be or to be" });
    expect([locate("to"), locate("be"), locate("or"), locate("to"), locate("be"), locate("nope")]).toEqual([
      0,
      3,
      6,
      9,
      12,
      null
    ]);
  });
});
