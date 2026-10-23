import { createHash } from "node:crypto";

export type UrlStore = {
  get: (code: string) => string | undefined;
  setIfAbsent: (code: string, longUrl: string) => boolean;
};

export type HashInput = {
  longUrl: string;
  attempt: number;
};

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = ALPHABET.length;
const CODE_LENGTH = 7;
export const CODE_SPACE = BASE ** CODE_LENGTH;
export const MAX_ATTEMPTS = 5;
const HASH_BYTES = 6;

export function sha256Hash({ longUrl, attempt }: HashInput) {
  return createHash("sha256").update(`${longUrl}#${attempt}`).digest().readUIntBE(0, HASH_BYTES);
}

export function encodeBase62(_id: number) {
  return "";
}

export function decodeBase62(_code: string) {
  return 0;
}

export function shorten(_options: {
  longUrl: string;
  store: UrlStore;
  hash?: (input: HashInput) => number;
}) {
  return "";
}
