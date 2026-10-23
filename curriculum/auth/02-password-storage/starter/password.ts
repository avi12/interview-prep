import { randomBytes, scrypt, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

export type ScryptParams = {
  cost: number;
  blockSize: number;
  parallelization: number;
};

export const DEFAULT_PARAMS: ScryptParams = {
  cost: 2 ** 14,
  blockSize: 8,
  parallelization: 1
};

export const ALGORITHM = "scrypt";
export const SEPARATOR = "$";
export const ENCODING = "base64";
const SALT_BYTES = 16;
export const KEY_BYTES = 32;

export const deriveKey = promisify<string, Buffer, number, ScryptOptions, Buffer>(scrypt);

export async function hashPassword({
  password: _password,
  salt: _salt = randomBytes(SALT_BYTES),
  params: _params = DEFAULT_PARAMS
}: {
  password: string;
  salt?: Buffer;
  params?: ScryptParams;
}) {
  return "";
}

export async function verifyPassword(_input: {
  password: string;
  stored: string;
}) {
  return false;
}
