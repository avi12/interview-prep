import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { GetRandomBytes } from "#kit/nodeCrypto.ts";

export const PKCE_METHOD = "S256";

export const CallbackFailure = {
  stateMismatch: "state_mismatch",
  providerError: "provider_error",
  missingCode: "missing_code"
} as const;

const VERIFIER_BYTES = 32;
const ENCODING = "base64url";
const CHALLENGE_HASH = "sha256";

export function createPkcePair({ getRandomBytes = randomBytes }: { getRandomBytes?: GetRandomBytes } = {}) {
  return { codeVerifier: "", codeChallenge: "", method: PKCE_METHOD };
}

export function validateCallback({ callbackUrl, expectedState }: { callbackUrl: string; expectedState: string }) {
  return { isValid: false, reason: "" };
}
