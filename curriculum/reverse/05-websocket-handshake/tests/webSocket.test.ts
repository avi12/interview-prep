import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Frame = { isFinal: boolean; opcode: number; payload: Uint8Array };
type Module = {
  computeAccept: (key: string) => string;
  unmaskFrame: (frame: Uint8Array) => Frame;
};

const { computeAccept, unmaskFrame } = await loadImpl<Module>({ testUrl: import.meta.url, file: "webSocket.ts" });

const MASK_BIT = 0b10000000;
const MAX_SMALL_LENGTH = 125;
const MAX_MEDIUM_LENGTH = 0xffff;
const MEDIUM_LENGTH_CODE = 126;
const LARGE_LENGTH_CODE = 127;
const OPCODE_TEXT = 0x1;
const OPCODE_BINARY = 0x2;
const FIN_BIT = 0b10000000;
const MASKING_KEY = [0x37, 0xfa, 0x21, 0x3d];
const OTHER_MASKING_KEY = [0x00, 0xff, 0x10, 0x99];
const LARGE_PAYLOAD_SIZE = 70_000;

const lengthBytes = (length: number) => {
  if (length <= MAX_SMALL_LENGTH) return [length | MASK_BIT];
  const bytes = new Uint8Array(length <= MAX_MEDIUM_LENGTH ? 2 : 8);
  const view = new DataView(bytes.buffer);
  if (length <= MAX_MEDIUM_LENGTH) view.setUint16(0, length);
  else view.setBigUint64(0, BigInt(length));
  return [(length <= MAX_MEDIUM_LENGTH ? MEDIUM_LENGTH_CODE : LARGE_LENGTH_CODE) | MASK_BIT, ...bytes];
};

const maskFrame = ({ opcode, payload, maskingKey, isFinal = true }: { opcode: number; payload: Uint8Array; maskingKey: number[]; isFinal?: boolean }) => {
  const masked = payload.map((byte, index) => byte ^ maskingKey[index % maskingKey.length]);
  return Uint8Array.from([(isFinal ? FIN_BIT : 0) | opcode, ...lengthBytes(payload.length), ...maskingKey, ...masked]);
};

const textBytes = (text: string) => new TextEncoder().encode(text);

describe("computeAccept", () => {
  it("matches the example in RFC 6455", () => {
    expect(computeAccept("dGhlIHNhbXBsZSBub25jZQ==")).toBe("s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
  });

  it("works for any other key", () => {
    expect(computeAccept("x3JJHMbDL1EzLkh9GBhXDw==")).toBe("HSmrc0sMlYUkAGmm5OPpG2HaGWk=");
    expect(computeAccept("AQIDBAUGBwgJCgsMDQ4PEA==")).toBe("C/0nmHhBztSRGR1CwL6Tf4ZjwpY=");
  });
});

describe("unmaskFrame", () => {
  it("decodes the masked Hello frame from RFC 6455", () => {
    const frame = Uint8Array.from([0x81, 0x85, 0x37, 0xfa, 0x21, 0x3d, 0x7f, 0x9f, 0x4d, 0x51, 0x58]);
    const result = unmaskFrame(frame);
    expect(new TextDecoder().decode(result.payload)).toBe("Hello");
    expect(result.opcode).toBe(OPCODE_TEXT);
    expect(result.isFinal).toBe(true);
  });

  it("reads the opcode and the FIN flag of a first fragment", () => {
    const frame = maskFrame({ opcode: OPCODE_BINARY, payload: Uint8Array.from([1, 2, 3, 4, 5]), maskingKey: OTHER_MASKING_KEY, isFinal: false });
    const result = unmaskFrame(frame);
    expect(result.isFinal).toBe(false);
    expect(result.opcode).toBe(OPCODE_BINARY);
    expect([...result.payload]).toEqual([1, 2, 3, 4, 5]);
  });

  it("applies the 4-byte key cyclically on a long text", () => {
    const text = "Read Aloud speaks one frame at a time.";
    const result = unmaskFrame(maskFrame({ opcode: OPCODE_TEXT, payload: textBytes(text), maskingKey: MASKING_KEY }));
    expect(new TextDecoder().decode(result.payload)).toBe(text);
  });

  it("handles an empty payload", () => {
    const result = unmaskFrame(maskFrame({ opcode: OPCODE_TEXT, payload: new Uint8Array(), maskingKey: MASKING_KEY }));
    expect(result.payload.length).toBe(0);
  });

  it("reads the 16-bit length form used from 126 bytes up", () => {
    const payload = Uint8Array.from({ length: 300 }, (_, index) => index % 251);
    const result = unmaskFrame(maskFrame({ opcode: OPCODE_BINARY, payload, maskingKey: MASKING_KEY }));
    expect([...result.payload]).toEqual([...payload]);
  });

  it("reads the 64-bit length form used from 65536 bytes up", () => {
    const payload = Uint8Array.from({ length: LARGE_PAYLOAD_SIZE }, (_, index) => index % 253);
    const result = unmaskFrame(maskFrame({ opcode: OPCODE_BINARY, payload, maskingKey: OTHER_MASKING_KEY }));
    expect(result.payload.length).toBe(LARGE_PAYLOAD_SIZE);
    expect(result.payload.every((byte, index) => byte === index % 253)).toBe(true);
  });

  it("does not change the frame it was given", () => {
    const frame = maskFrame({ opcode: OPCODE_TEXT, payload: textBytes("keep me"), maskingKey: MASKING_KEY });
    const before = [...frame];
    unmaskFrame(frame);
    expect([...frame]).toEqual(before);
  });

  it("reads a frame that is a view into a bigger buffer", () => {
    const frame = maskFrame({ opcode: OPCODE_TEXT, payload: textBytes("view"), maskingKey: MASKING_KEY });
    const bigger = new Uint8Array(frame.length + 6);
    bigger.set(frame, 3);
    const result = unmaskFrame(bigger.subarray(3, 3 + frame.length));
    expect(new TextDecoder().decode(result.payload)).toBe("view");
  });

  it("rejects a frame that is not masked, because a client must mask", () => {
    const unmasked = Uint8Array.from([0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    expect(() => unmaskFrame(unmasked)).toThrow();
  });

  it("rejects a frame cut short", () => {
    const frame = maskFrame({ opcode: OPCODE_TEXT, payload: textBytes("truncated"), maskingKey: MASKING_KEY });
    expect(() => unmaskFrame(frame.subarray(0, frame.length - 3))).toThrow();
    expect(() => unmaskFrame(Uint8Array.from([0x81]))).toThrow();
  });
});
