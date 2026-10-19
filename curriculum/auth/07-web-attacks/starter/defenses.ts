import { randomBytes, timingSafeEqual } from "node:crypto";

type GetRandomBytes = (size: number) => Buffer;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const TOKEN_BYTES = 32;
const TOKEN_ENCODING = "base64url";

export const escapeHtml = (text: string) => text;

export const createCsrfToken = ({ getRandomBytes = randomBytes }: { getRandomBytes?: GetRandomBytes } = {}) => "";

export function isCsrfRequestAllowed({
  method,
  sessionToken,
  submittedToken
}: {
  method: string;
  sessionToken: string;
  submittedToken: string | undefined;
}) {
  return true;
}
