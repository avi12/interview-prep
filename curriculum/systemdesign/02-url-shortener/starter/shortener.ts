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
  return "";
};

export const decodeBase62 = (code: string) => {
  return 0;
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
  return "";
};
