import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { GetRandomBytes } from "#kit/nodeCrypto.ts";

export const PKCE_METHOD = "S256";

export const CallbackFailure = {
  stateMismatch: "state_mismatch",
  providerError: "provider_error",
  missingCode: "missing_code"
} as const;

type CallbackFailureReason = (typeof CallbackFailure)[keyof typeof CallbackFailure];

const VERIFIER_BYTES = 32;
const ENCODING = "base64url";
const CHALLENGE_HASH = "sha256";

const failure = (reason: CallbackFailureReason) => ({ isValid: false as const, reason });

const isSameState = ({ received, expected }: { received: string | null; expected: string }) => {
  if (!received || !expected) return false;
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
};

export function createPkcePair({ getRandomBytes = randomBytes }: { getRandomBytes?: GetRandomBytes } = {}) {
  const codeVerifier = getRandomBytes(VERIFIER_BYTES).toString(ENCODING);
  const codeChallenge = createHash(CHALLENGE_HASH).update(codeVerifier).digest(ENCODING);
  return { codeVerifier, codeChallenge, method: PKCE_METHOD };
}

export function validateCallback({ callbackUrl, expectedState }: { callbackUrl: string; expectedState: string }) {
  const params = new URL(callbackUrl).searchParams;
  if (!isSameState({ received: params.get("state"), expected: expectedState })) return failure(CallbackFailure.stateMismatch);
  if (params.has("error")) return failure(CallbackFailure.providerError);
  const code = params.get("code");
  if (!code) return failure(CallbackFailure.missingCode);
  return { isValid: true as const, code };
}
