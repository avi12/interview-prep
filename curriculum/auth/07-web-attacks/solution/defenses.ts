import type { GetRandomBytes } from "#kit/nodeCrypto.ts";
import { randomBytes, timingSafeEqual } from "node:crypto";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#x27;"
};
const HTML_SPECIAL_CHARACTERS = /[&<>"']/g;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const TOKEN_BYTES = 32;
const TOKEN_ENCODING = "base64url";

function isSameText({ first, second }: {
  first: string;
  second: string;
}) {
  const firstBytes = Buffer.from(first);
  const secondBytes = Buffer.from(second);
  return firstBytes.length === secondBytes.length && timingSafeEqual(firstBytes, secondBytes);
}

export function escapeHtml(text: string) {
  return text.replace(HTML_SPECIAL_CHARACTERS, character => HTML_ESCAPES[character]);
}

export function createCsrfToken({ getRandomBytes = randomBytes }: { getRandomBytes?: GetRandomBytes } = {}) {
  return getRandomBytes(TOKEN_BYTES).toString(TOKEN_ENCODING);
}

export function isCsrfRequestAllowed({
  method,
  sessionToken,
  submittedToken
}: {
  method: string;
  sessionToken: string;
  submittedToken: string | undefined;
}) {
  if (SAFE_METHODS.has(method.toUpperCase())) {
    return true;
  }

  if (!sessionToken || !submittedToken) {
    return false;
  }

  return isSameText({
    first: sessionToken,
    second: submittedToken
  });
}
