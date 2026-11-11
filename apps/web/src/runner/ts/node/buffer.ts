import { Buffer } from "buffer";

const BASE64URL = "base64url";
const BASE64 = "base64";
const PLUS = /\+/g;
const SLASH = /\//g;
const PADDING = /=+$/;

function toBase64Url(base64: string) {
  return base64.replace(PLUS, "-").replace(SLASH, "_").replace(PADDING, "");
}

function standardEncoding(encoding: unknown) {
  return encoding === BASE64URL ? BASE64 : encoding;
}

function invoke({ method, target, args }: {
  method: (...args: never[]) => unknown;
  target: unknown;
  args: unknown[];
}) {
  return Function.prototype.apply.call(method, target, args);
}

export function withBase64Url() {
  const { from, byteLength, isEncoding } = Buffer;
  const { toString, write } = Buffer.prototype;
  Object.assign(Buffer, {
    from: (value: unknown, encoding?: unknown, length?: number) => invoke({
      method: from,
      target: Buffer,
      args: [value, standardEncoding(encoding), length]
    }),
    byteLength: (value: string, encoding?: unknown) => invoke({
      method: byteLength,
      target: Buffer,
      args: [value, standardEncoding(encoding)]
    }),
    isEncoding: (encoding: string) => encoding === BASE64URL || isEncoding(encoding)
  });
  Object.assign(Buffer.prototype, {
    toString(this: Buffer, encoding?: string, start?: number, end?: number) {
      if (encoding === BASE64URL) {
        return toBase64Url(toString.call(this, BASE64, start, end));
      }

      return invoke({
        method: toString,
        target: this,
        args: [encoding, start, end]
      });
    },
    write(this: Buffer, text: string, ...rest: unknown[]) {
      return invoke({
        method: write,
        target: this,
        args: [text, ...rest.map(standardEncoding)]
      });
    }
  });
  return Buffer;
}

export const nodeBuffer = {
  Buffer,
  default: {
    Buffer
  }
};
