import type { GetRandomBytes } from "#kit/nodeCrypto.ts";
import { randomBytes } from "node:crypto";

export const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
export const TOKEN_BYTES = 32;
export const TOKEN_ENCODING = "base64url";

export function escapeHtml(text: string) {
  return text;
}

export function createCsrfToken({
  getRandomBytes: _getRandomBytes = randomBytes
}: {
  getRandomBytes?: GetRandomBytes;
} = {}) {
  return "";
}

export function isCsrfRequestAllowed(_input: {
  method: string;
  sessionToken: string;
  submittedToken: string | undefined;
}) {
  return true;
}
