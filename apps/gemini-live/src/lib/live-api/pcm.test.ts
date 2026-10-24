import { downsample, floatToPcm16, pcm16Bytes, pcm16ToFloat } from "./pcm.ts";
import { describe, expect, it } from "vitest";

describe("floatToPcm16", () => {
  it("maps the full float range onto 16-bit samples and clamps the rest", () => {
    expect([...floatToPcm16(new Float32Array([0, 1, -1, 2, -2]))]).toEqual([0, 32767, -32768, 32767, -32768]);
  });
});

describe("pcm16ToFloat", () => {
  it("reads little-endian samples back into floats", () => {
    const bytes = pcm16Bytes(new Int16Array([0, 32767, -32768]));
    expect([...pcm16ToFloat(bytes)]).toEqual([0, 1, -1]);
  });

  it("ignores a trailing odd byte", () => {
    expect(pcm16ToFloat(new Uint8Array([0, 0, 1])).length).toBe(1);
  });
});

describe("downsample", () => {
  it("averages each window down to the target rate", () => {
    const samples = new Float32Array([0, 1, 0.5, -1, -0.5, 0]);
    expect([...downsample({
      samples,
      fromRate: 48_000,
      toRate: 16_000
    })]).toEqual([0.5, -0.5]);
  });

  it("leaves audio that is already at the target rate untouched", () => {
    const samples = new Float32Array([0.25, 0.5]);
    expect(
      downsample({
        samples,
        fromRate: 16_000,
        toRate: 16_000
      })
    ).toBe(samples);
  });
});
