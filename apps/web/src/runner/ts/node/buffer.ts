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

function invoke({ method, target, args }: { method: (...args: never[]) => unknown; target: unknown; args: unknown[] }) {
  return Function.prototype.apply.call(method, target, args);
}

function methodOf({ owner, name }: { owner: object; name: string }) {
  return Object.getOwnPropertyDescriptor(owner, name)?.value;
}

export function withBase64Url() {
  const from = methodOf({
    owner: Buffer,
    name: "from"
  });
  const byteLength = methodOf({
    owner: Buffer,
    name: "byteLength"
  });
  const isEncoding = methodOf({
    owner: Buffer,
    name: "isEncoding"
  });
  const toString = methodOf({
    owner: Buffer.prototype,
    name: "toString"
  });
  const write = methodOf({
    owner: Buffer.prototype,
    name: "write"
  });
  Object.assign(Buffer, {
    from: (value: unknown, encoding?: unknown, length?: number) =>
      invoke({
        method: from,
        target: Buffer,
        args: [value, standardEncoding(encoding), length]
      }),
    byteLength: (value: string, encoding?: unknown) =>
      invoke({
        method: byteLength,
        target: Buffer,
        args: [value, standardEncoding(encoding)]
      }),
    isEncoding: (encoding: string) => encoding === BASE64URL || isEncoding(encoding)
  });
  Object.assign(Buffer.prototype, {
    toString(this: Buffer, encoding?: string, start?: number, end?: number) {
      const isBase64Url = encoding === BASE64URL;
      if (isBase64Url) {
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
