import { createHash } from "node:crypto";

const WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const FIN_BIT = 0b10000000;
const OPCODE_MASK = 0b00001111;
const MASK_BIT = 0b10000000;
const LENGTH_MASK = 0b01111111;
const LENGTH_IN_16_BITS = 126;
const LENGTH_IN_64_BITS = 127;
const FIXED_HEADER_BYTES = 2;
const LENGTH_16_BYTES = 2;
const LENGTH_64_BYTES = 8;
const MASKING_KEY_BYTES = 4;

export function computeAccept(key: string) {
  return createHash("sha1").update(key + WEBSOCKET_GUID).digest("base64");
}

function readPayloadLength(frame: Uint8Array) {
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const lengthCode = frame[1] & LENGTH_MASK;
  if (lengthCode === LENGTH_IN_16_BITS) {
    return {
      length: view.getUint16(FIXED_HEADER_BYTES),
      lengthBytes: LENGTH_16_BYTES
    };
  }

  if (lengthCode === LENGTH_IN_64_BITS) {
    return {
      length: Number(view.getBigUint64(FIXED_HEADER_BYTES)),
      lengthBytes: LENGTH_64_BYTES
    };
  }

  return {
    length: lengthCode,
    lengthBytes: 0
  };
}

export function unmaskFrame(frame: Uint8Array) {
  if (frame.length < FIXED_HEADER_BYTES) {
    throw new Error("frame is too short");
  }

  const isMasked = (frame[1] & MASK_BIT) !== 0;
  if (!isMasked) {
    throw new Error("client frames must be masked");
  }

  const { length, lengthBytes } = readPayloadLength(frame);
  const keyStart = FIXED_HEADER_BYTES + lengthBytes;
  const payloadStart = keyStart + MASKING_KEY_BYTES;
  if (frame.length < payloadStart + length) {
    throw new Error("frame is shorter than its declared length");
  }

  const maskingKey = frame.subarray(keyStart, payloadStart);
  const payload = frame
    .subarray(payloadStart, payloadStart + length)
    .map((byte, index) => byte ^ maskingKey[index % MASKING_KEY_BYTES]);
  return {
    isFinal: (frame[0] & FIN_BIT) !== 0,
    opcode: frame[0] & OPCODE_MASK,
    payload
  };
}
