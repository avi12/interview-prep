import { createHash } from "node:crypto";

export type UrlStore = {
  get: (code: string) => string | undefined;
  setIfAbsent: (code: string, longUrl: string) => boolean;
};

export type HashInput = { longUrl: string; attempt: number };

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = ALPHABET.length;
const CODE_LENGTH = 7;
const CODE_SPACE = BASE ** CODE_LENGTH;
const MAX_ATTEMPTS = 5;
const HASH_BYTES = 6;

export const sha256Hash = ({ longUrl, attempt }: HashInput) =>
  createHash("sha256").update(`${longUrl}#${attempt}`).digest().readUIntBE(0, HASH_BYTES);

export const encodeBase62 = (id: number) => {
  if (id === 0) return ALPHABET[0];
  let rest = id;
  let code = "";
  while (rest > 0) {
    code = ALPHABET[rest % BASE] + code;
    rest = Math.floor(rest / BASE);
  }
  return code;
};

export const decodeBase62 = (code: string) => {
  let id = 0;
  for (const char of code) id = id * BASE + ALPHABET.indexOf(char);
  return id;
};

export const shorten = ({
  longUrl,
  store,
  hash = sha256Hash
}: {
  longUrl: string;
  store: UrlStore;
  hash?: (input: HashInput) => number;
}) => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = encodeBase62(hash({ longUrl, attempt }) % CODE_SPACE);
    if (store.setIfAbsent(code, longUrl)) return code;
    if (store.get(code) === longUrl) return code;
  }
  throw new Error(`No free short code for ${longUrl} after ${MAX_ATTEMPTS} attempts`);
};
