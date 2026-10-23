import type { GetRandomBytes } from "#kit/nodeCrypto.ts";
import { randomBytes } from "node:crypto";

export const PKCE_METHOD = "S256";

export const CallbackFailure = {
  stateMismatch: "state_mismatch",
  providerError: "provider_error",
  missingCode: "missing_code"
} as const;

export const VERIFIER_BYTES = 32;
export const ENCODING = "base64url";
export const CHALLENGE_HASH = "sha256";

export function createPkcePair({
  getRandomBytes: _getRandomBytes = randomBytes
}: {
  getRandomBytes?: GetRandomBytes;
} = {}) {
  return {
    codeVerifier: "",
    codeChallenge: "",
    method: PKCE_METHOD
  };
}

export function validateCallback(_input: {
  callbackUrl: string;
  expectedState: string;
}) {
  return {
    isValid: false,
    reason: ""
  };
}
