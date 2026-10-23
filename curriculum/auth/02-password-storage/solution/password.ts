import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

export type ScryptParams = { cost: number; blockSize: number; parallelization: number };

export const DEFAULT_PARAMS: ScryptParams = { cost: 2 ** 14, blockSize: 8, parallelization: 1 };

const ALGORITHM = "scrypt";
const SEPARATOR = "$";
const ENCODING = "base64";
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const STORED_PART_COUNT = 6;
const MEMORY_BYTES_PER_COST_AND_BLOCK = 128;
const MEMORY_HEADROOM = 2;

const deriveKey = promisify<string, Buffer, number, ScryptOptions, Buffer>(scrypt);

const maxMemoryFor = ({ cost, blockSize }: ScryptParams) => MEMORY_BYTES_PER_COST_AND_BLOCK * cost * blockSize * MEMORY_HEADROOM;

const derive = ({ password, salt, params, keyBytes }: { password: string; salt: Buffer; params: ScryptParams; keyBytes: number }) =>
  deriveKey(password, salt, keyBytes, {
    cost: params.cost,
    blockSize: params.blockSize,
    parallelization: params.parallelization,
    maxmem: maxMemoryFor(params)
  });

const isPositiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0;

const parseStored = (stored: string) => {
  const parts = stored.split(SEPARATOR);
  if (parts.length !== STORED_PART_COUNT) return null;
  const [algorithm, cost, blockSize, parallelization, salt, hash] = parts;
  if (algorithm !== ALGORITHM) return null;
  const params = { cost: Number(cost), blockSize: Number(blockSize), parallelization: Number(parallelization) };
  if (!Object.values(params).every(isPositiveInteger)) return null;
  const parsed = { params, salt: Buffer.from(salt, ENCODING), hash: Buffer.from(hash, ENCODING) };
  if (parsed.salt.length === 0 || parsed.hash.length === 0) return null;
  return parsed;
};

export async function hashPassword({
  password,
  salt = randomBytes(SALT_BYTES),
  params = DEFAULT_PARAMS
}: {
  password: string;
  salt?: Buffer;
  params?: ScryptParams;
}) {
  const key = await derive({ password, salt, params, keyBytes: KEY_BYTES });
  const { cost, blockSize, parallelization } = params;
  return [ALGORITHM, cost, blockSize, parallelization, salt.toString(ENCODING), key.toString(ENCODING)].join(SEPARATOR);
}

export async function verifyPassword({ password, stored }: { password: string; stored: string }) {
  const parsed = parseStored(stored);
  if (!parsed) return false;
  const { params, salt, hash } = parsed;
  const key = await derive({ password, salt, params, keyBytes: hash.length }).catch(() => null);
  if (!key) return false;
  return timingSafeEqual(key, hash);
}
