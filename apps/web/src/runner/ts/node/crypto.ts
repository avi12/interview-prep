import { Buffer } from "buffer";

import { hmac } from "@noble/hashes/hmac.js";
import { md5, sha1 } from "@noble/hashes/legacy.js";
import { scryptAsync, scrypt as scryptSyncRaw } from "@noble/hashes/scrypt.js";
import { sha256, sha384, sha512 } from "@noble/hashes/sha2.js";

import { zod } from "@/lib/zod.ts";

type Input = string | Uint8Array;
type Encoding = Parameters<Buffer["toString"]>[0];
type ScryptCallback = (error: Error | null, key?: Buffer) => void;

const scryptOptionsSchema = zod
  .object({
    N: zod.number(),
    r: zod.number(),
    p: zod.number(),
    cost: zod.number(),
    blockSize: zod.number(),
    parallelization: zod.number(),
    maxmem: zod.number()
  })
  .partial();

type ScryptOptions = zod.infer<typeof scryptOptionsSchema>;

const HASHES = {
  sha1,
  sha256,
  sha384,
  sha512,
  md5
} as const;
const SCRYPT_DEFAULTS = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024
} as const;
const SCRYPT_BYTES_PER_BLOCK = 128;
const HASH_NAME_SEPARATOR = /-/g;
const UINT32_RANGE = 2 ** 32;
const ONE_NUMBER = 1;

function isHashName(name: string): name is keyof typeof HASHES {
  return Object.hasOwn(HASHES, name);
}

function isEncoding(encoding: unknown): encoding is Encoding {
  return typeof encoding === "string" && Buffer.isEncoding(encoding);
}

function hashOf(algorithm: string) {
  const name = algorithm.toLowerCase().replace(HASH_NAME_SEPARATOR, "");
  if (!isHashName(name)) {
    throw Object.assign(new Error(`Digest method not supported: ${algorithm}`), { code: "ERR_CRYPTO_INVALID_DIGEST" });
  }

  return HASHES[name];
}

function bytesOf({ data, encoding }: { data: Input; encoding?: string }) {
  if (typeof data !== "string") {
    return data;
  }

  return isEncoding(encoding) ? Buffer.from(data, encoding) : Buffer.from(data);
}

function encoded({ bytes, encoding }: { bytes: Uint8Array; encoding?: string }) {
  const buffer = Buffer.from(bytes);
  return encoding ? buffer.toString(isEncoding(encoding) ? encoding : undefined) : buffer;
}

function digester(
  start: () => {
    update: (bytes: Uint8Array) => unknown;
    digest: () => Uint8Array;
  }
) {
  const state = start();
  const api = {
    update(data: Input, encoding?: string) {
      state.update(
        bytesOf({
          data,
          encoding
        })
      );
      return api;
    },
    digest: (encoding?: string) =>
      encoded({
        bytes: state.digest(),
        encoding
      }),
    copy: () => api
  };
  return api;
}

function createHash(algorithm: string) {
  return digester(() => hashOf(algorithm).create());
}

function createHmac(algorithm: string, key: Input) {
  return digester(() => hmac.create(hashOf(algorithm), bytesOf({ data: key })));
}

function randomBytes(size: number, callback?: (error: Error | null, bytes: Buffer) => void) {
  const bytes = Buffer.from(crypto.getRandomValues(new Uint8Array(size)));
  callback?.(null, bytes);
  return bytes;
}

function randomInt(min: number, max?: number) {
  const [low, high] = max === undefined ? [0, min] : [min, max];
  return low + Math.floor((crypto.getRandomValues(new Uint32Array(ONE_NUMBER))[0] / UINT32_RANGE) * (high - low));
}

function timingSafeEqual(first: Uint8Array, second: Uint8Array) {
  if (first.byteLength !== second.byteLength) {
    throw Object.assign(new RangeError("Input buffers must have the same byte length"), {
      code: "ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH"
    });
  }

  let difference = 0;
  for (const [index, byte] of first.entries()) {
    difference |= byte ^ second[index];
  }
  return difference === 0;
}

function scryptParams({ keyLength, options = {} }: { keyLength: number; options?: ScryptOptions }) {
  const params = {
    N: options.N ?? options.cost ?? SCRYPT_DEFAULTS.N,
    r: options.r ?? options.blockSize ?? SCRYPT_DEFAULTS.r,
    p: options.p ?? options.parallelization ?? SCRYPT_DEFAULTS.p,
    maxmem: options.maxmem ?? SCRYPT_DEFAULTS.maxmem,
    dkLen: keyLength
  };
  if (SCRYPT_BYTES_PER_BLOCK * params.N * params.r > params.maxmem) {
    throw Object.assign(new RangeError("Invalid scrypt params: memory limit exceeded"), {
      code: "ERR_CRYPTO_INVALID_SCRYPT_PARAMS"
    });
  }

  return params;
}

function scryptSync(password: Input, salt: Input, keyLength: number, options?: ScryptOptions) {
  return Buffer.from(
    scryptSyncRaw(
      bytesOf({ data: password }),
      bytesOf({ data: salt }),
      scryptParams({
        keyLength,
        options
      })
    )
  );
}

function scrypt(
  password: Input,
  salt: Input,
  keyLength: number,
  optionsOrCallback: ScryptOptions | ScryptCallback,
  maybeCallback?: ScryptCallback
) {
  const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback;
  const options = typeof optionsOrCallback === "function" ? undefined : optionsOrCallback;
  async function derive() {
    return Buffer.from(
      await scryptAsync(
        bytesOf({ data: password }),
        bytesOf({ data: salt }),
        scryptParams({
          keyLength,
          options
        })
      )
    );
  }

  derive().then(
    key => callback?.(null, key),
    (error: Error) => callback?.(error)
  );
}

const api = {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID: () => crypto.randomUUID(),
  getRandomValues: <T extends ArrayBufferView<ArrayBuffer>>(array: T) => crypto.getRandomValues(array),
  timingSafeEqual,
  scrypt,
  scryptSync,
  webcrypto: crypto,
  subtle: crypto.subtle
};

export const nodeCrypto = {
  ...api,
  default: api
};
