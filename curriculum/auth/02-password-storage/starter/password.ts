import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

export type ScryptParams = { cost: number; blockSize: number; parallelization: number };

export const DEFAULT_PARAMS: ScryptParams = { cost: 2 ** 14, blockSize: 8, parallelization: 1 };

const ALGORITHM = "scrypt";
const SEPARATOR = "$";
const ENCODING = "base64";
const SALT_BYTES = 16;
const KEY_BYTES = 32;

const deriveKey = promisify<string, Buffer, number, ScryptOptions, Buffer>(scrypt);

export async function hashPassword({
  password,
  salt = randomBytes(SALT_BYTES),
  params = DEFAULT_PARAMS
}: {
  password: string;
  salt?: Buffer;
  params?: ScryptParams;
}) {
  return "";
}

export async function verifyPassword({ password, stored }: { password: string; stored: string }) {
  return false;
}
