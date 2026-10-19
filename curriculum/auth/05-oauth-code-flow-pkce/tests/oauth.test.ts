import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import type { GetRandomBytes } from "#kit/nodeCrypto.ts";

type Callback = { isValid: true; code: string } | { isValid: false; reason: string };
type Module = {
  createPkcePair: (input?: { getRandomBytes?: GetRandomBytes }) => { codeVerifier: string; codeChallenge: string; method: string };
  validateCallback: (input: { callbackUrl: string; expectedState: string }) => Callback;
};

const { createPkcePair, validateCallback } = await loadImpl<Module>({ testUrl: import.meta.url, file: "oauth.ts" });

const RFC_7636_OCTETS = [
  116, 24, 223, 180, 151, 153, 224, 37, 79, 250, 96, 125, 216, 173, 187, 186, 22, 212, 37, 77, 105, 214, 191, 240, 91, 88, 5, 88, 83, 132, 141, 121
];
const RFC_7636_VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const RFC_7636_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const MIN_VERIFIER_LENGTH = 43;
const MAX_VERIFIER_LENGTH = 128;
const MIN_ENTROPY_BYTES = 32;
const PAIR_COUNT = 200;

const EXPECTED_STATE = "k3J9xQ2mZpL7";
const CALLBACK_BASE = "https://app.example.com/callback";

const withQuery = (query: string) => `${CALLBACK_BASE}?${query}`;
const validate = ({ query, expectedState = EXPECTED_STATE }: { query: string; expectedState?: string }) =>
  validateCallback({ callbackUrl: withQuery(query), expectedState });

describe("createPkcePair", () => {
  it("reproduces the example in RFC 7636 Appendix B", () => {
    const pair = createPkcePair({ getRandomBytes: () => Buffer.from(RFC_7636_OCTETS) });
    expect(pair.codeVerifier).toBe(RFC_7636_VERIFIER);
    expect(pair.codeChallenge).toBe(RFC_7636_CHALLENGE);
  });

  it("announces the S256 method", () => {
    expect(createPkcePair().method).toBe("S256");
  });

  it("makes the challenge the base64url SHA-256 of the verifier, with no padding", () => {
    const { codeVerifier, codeChallenge } = createPkcePair();
    expect(codeChallenge).toBe(createHash("sha256").update(codeVerifier).digest("base64url"));
    expect(codeChallenge).not.toMatch(/[=+/]/);
    expect(codeChallenge).not.toBe(codeVerifier);
  });

  it("makes a verifier of 43 to 128 unreserved characters", () => {
    const { codeVerifier } = createPkcePair();
    expect(codeVerifier.length).toBeGreaterThanOrEqual(MIN_VERIFIER_LENGTH);
    expect(codeVerifier.length).toBeLessThanOrEqual(MAX_VERIFIER_LENGTH);
    expect(codeVerifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it("asks for at least 256 bits of randomness", () => {
    const requestedSizes: number[] = [];
    createPkcePair({
      getRandomBytes: size => {
        requestedSizes.push(size);
        return Buffer.alloc(size, 1);
      }
    });
    expect(Math.max(...requestedSizes)).toBeGreaterThanOrEqual(MIN_ENTROPY_BYTES);
  });

  it("makes a new verifier every time", () => {
    const verifiers = new Set(Array.from({ length: PAIR_COUNT }, () => createPkcePair().codeVerifier));
    expect(verifiers.size).toBe(PAIR_COUNT);
  });
});

describe("validateCallback", () => {
  it("accepts a callback whose state matches and returns the code", () => {
    expect(validate({ query: `code=abc123&state=${EXPECTED_STATE}` })).toEqual({ isValid: true, code: "abc123" });
  });

  it("rejects a different state", () => {
    expect(validate({ query: "code=abc123&state=attacker-state" })).toEqual({ isValid: false, reason: "state_mismatch" });
  });

  it("rejects a callback with no state at all", () => {
    expect(validate({ query: "code=abc123" })).toEqual({ isValid: false, reason: "state_mismatch" });
  });

  it("rejects a state that only starts like the real one", () => {
    expect(validate({ query: `code=abc123&state=${EXPECTED_STATE}extra` })).toEqual({ isValid: false, reason: "state_mismatch" });
    expect(validate({ query: `code=abc123&state=${EXPECTED_STATE.slice(0, 4)}` })).toEqual({ isValid: false, reason: "state_mismatch" });
  });

  it("rejects a state with the right length but different characters, or different letter case", () => {
    const sameLength = `${EXPECTED_STATE.slice(0, -1)}X`;
    for (const state of [sameLength, EXPECTED_STATE.toUpperCase(), EXPECTED_STATE.toLowerCase()]) {
      expect(validate({ query: `code=abc123&state=${state}` })).toEqual({ isValid: false, reason: "state_mismatch" });
    }
  });

  it("rejects when the app has no saved state, even if the callback also has none", () => {
    expect(validate({ query: "code=abc123", expectedState: "" })).toEqual({ isValid: false, reason: "state_mismatch" });
    expect(validate({ query: "code=abc123&state=", expectedState: "" })).toEqual({ isValid: false, reason: "state_mismatch" });
  });

  it("rejects a matching state with no code", () => {
    expect(validate({ query: `state=${EXPECTED_STATE}` })).toEqual({ isValid: false, reason: "missing_code" });
    expect(validate({ query: `code=&state=${EXPECTED_STATE}` })).toEqual({ isValid: false, reason: "missing_code" });
  });

  it("reports an error from the provider, such as access_denied", () => {
    expect(validate({ query: `error=access_denied&state=${EXPECTED_STATE}` })).toEqual({ isValid: false, reason: "provider_error" });
  });

  it("reports a provider error even when a code is present too", () => {
    expect(validate({ query: `code=abc123&error=server_error&state=${EXPECTED_STATE}` })).toEqual({ isValid: false, reason: "provider_error" });
  });

  it("checks the state before it trusts anything else in the callback", () => {
    expect(validate({ query: "error=access_denied&state=attacker-state" })).toEqual({ isValid: false, reason: "state_mismatch" });
  });

  it("does not return the code when the state is wrong", () => {
    const result = validate({ query: "code=stolen&state=attacker-state" });
    expect(JSON.stringify(result)).not.toContain("stolen");
  });
});
