import { createHmac, timingSafeEqual } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import type { JwtClaims } from "../starter/jwt.ts";

vi.mock("node:crypto", async importOriginal =>
  (await import("#kit/nodeCrypto.ts")).withSpiedTimingSafeEqual(await importOriginal<typeof import("node:crypto")>())
);

type Module = {
  signJwt: (input: { claims: JwtClaims; secret: string }) => string;
  verifyJwt: (input: { token: string; secret: string; issuer: string; audience: string; now: () => number }) => JwtClaims;
};

const { signJwt, verifyJwt } = await loadImpl<Module>({ testUrl: import.meta.url, file: "jwt.ts" });

const SECRET = "this-secret-is-at-least-32-bytes-long";
const OTHER_SECRET = "another-secret-that-is-also-32-bytes";
const SECRET_32_BYTES = "k".repeat(32);
const SECRET_31_BYTES = "k".repeat(31);
const ISSUER = "https://auth.example.com";
const AUDIENCE = "orders-api";
const NOW_SECONDS = 1_900_000_000;
const TEN_MINUTES = 600;
const MS_PER_SECOND = 1000;

const validClaims = (overrides: JwtClaims = {}): JwtClaims => ({
  iss: ISSUER,
  aud: AUDIENCE,
  sub: "user-1",
  iat: NOW_SECONDS,
  exp: NOW_SECONDS + TEN_MINUTES,
  ...overrides
});

const toSegment = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

const forge = ({
  header = { alg: "HS256", typ: "JWT" },
  claims = validClaims(),
  secret = SECRET,
  hash = "sha256"
}: {
  header?: Record<string, unknown>;
  claims?: JwtClaims;
  secret?: string;
  hash?: string;
} = {}) => {
  const signingInput = `${toSegment(header)}.${toSegment(claims)}`;
  return `${signingInput}.${createHmac(hash, secret).update(signingInput).digest("base64url")}`;
};

const verifyAt = ({ token, nowSeconds = NOW_SECONDS, secret = SECRET }: { token: string; nowSeconds?: number; secret?: string }) =>
  verifyJwt({ token, secret, issuer: ISSUER, audience: AUDIENCE, now: () => nowSeconds * MS_PER_SECOND });

const replaceSegment = ({ token, index, value }: { token: string; index: number; value: string }) => {
  const segments = token.split(".");
  segments[index] = value;
  return segments.join(".");
};

describe("signJwt", () => {
  it("produces the standard header.payload.signature layout, in base64url", () => {
    const token = signJwt({ claims: validClaims(), secret: SECRET });
    expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    const [header, payload] = token.split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({ alg: "HS256", typ: "JWT" });
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toEqual(validClaims());
  });

  it("signs with HMAC-SHA256 over 'header.payload', so other libraries can verify it", () => {
    expect(signJwt({ claims: validClaims(), secret: SECRET })).toBe(forge());
  });

  it("refuses a secret shorter than 32 bytes", () => {
    expect(() => signJwt({ claims: validClaims(), secret: "password123" })).toThrow();
  });

  it("draws the line at exactly 32 bytes: 31 is refused, 32 is fine", () => {
    expect(() => signJwt({ claims: validClaims(), secret: SECRET_31_BYTES })).toThrow();
    expect(() => signJwt({ claims: validClaims(), secret: SECRET_32_BYTES })).not.toThrow();
  });
});

describe("verifyJwt: the happy path", () => {
  it("returns the claims of a token it signed", () => {
    const token = signJwt({ claims: validClaims(), secret: SECRET });
    expect(verifyAt({ token })).toEqual(validClaims());
  });

  it("accepts an audience list that contains ours", () => {
    const token = forge({ claims: validClaims({ aud: ["billing-api", AUDIENCE] }) });
    expect(verifyAt({ token }).sub).toBe("user-1");
  });
});

describe("verifyJwt: tampering", () => {
  it("rejects a payload that was edited after signing (role: user -> admin)", () => {
    const token = forge({ claims: validClaims({ role: "user" }) });
    const edited = toSegment(validClaims({ role: "admin" }));
    expect(() => verifyAt({ token: replaceSegment({ token, index: 1, value: edited }) })).toThrow();
  });

  it("rejects a flipped signature", () => {
    const token = forge();
    const [, , signature] = token.split(".");
    const flipped = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
    expect(() => verifyAt({ token: replaceSegment({ token, index: 2, value: flipped }) })).toThrow();
  });

  it("rejects a token signed with another secret", () => {
    expect(() => verifyAt({ token: forge({ secret: OTHER_SECRET }) })).toThrow();
  });

  it("rejects a token with junk added after a valid signature", () => {
    expect(() => verifyAt({ token: `${forge()}AAAA` })).toThrow();
  });

  it("rejects tokens that are not three segments or not JSON", () => {
    const notJson = Buffer.from("not json").toString("base64url");
    for (const token of ["", "abc", "a.b", "a.b.c.d", `${notJson}.${toSegment({})}.sig`]) {
      expect(() => verifyAt({ token })).toThrow();
    }
  });

  it("refuses a verifying secret shorter than 32 bytes, even for a token that was signed with it", () => {
    expect(() => verifyAt({ token: forge({ secret: "short" }), secret: "short" })).toThrow();
    expect(() => verifyAt({ token: forge({ secret: SECRET_31_BYTES }), secret: SECRET_31_BYTES })).toThrow();
    expect(verifyAt({ token: forge({ secret: SECRET_32_BYTES }), secret: SECRET_32_BYTES }).sub).toBe("user-1");
  });

  it("compares signatures with crypto.timingSafeEqual, not with ===", () => {
    vi.mocked(timingSafeEqual).mockClear();
    verifyAt({ token: forge() });
    expect(timingSafeEqual).toHaveBeenCalled();
  });
});

describe("verifyJwt: the algorithm attacks", () => {
  it("rejects alg none with an empty signature", () => {
    const token = `${toSegment({ alg: "none", typ: "JWT" })}.${toSegment(validClaims())}.`;
    expect(() => verifyAt({ token })).toThrow();
  });

  it("rejects alg none spelled in other cases, even with a signature attached", () => {
    for (const alg of ["none", "None", "NONE"]) {
      const token = forge({ header: { alg, typ: "JWT" } });
      expect(() => verifyAt({ token })).toThrow();
    }
  });

  it("rejects HS512 even when its signature is perfectly valid (the server decides the algorithm)", () => {
    const token = forge({ header: { alg: "HS512", typ: "JWT" }, hash: "sha512" });
    expect(() => verifyAt({ token })).toThrow();
  });

  it("rejects an RS256 header on an HMAC token (algorithm confusion)", () => {
    const token = forge({ header: { alg: "RS256", typ: "JWT" } });
    expect(() => verifyAt({ token })).toThrow();
  });

  it("rejects hs256 in lowercase: the algorithm name must match exactly", () => {
    expect(() => verifyAt({ token: forge({ header: { alg: "hs256", typ: "JWT" } }) })).toThrow();
  });

  it("rejects a header with no alg at all", () => {
    expect(() => verifyAt({ token: forge({ header: { typ: "JWT" } }) })).toThrow();
  });
});

describe("verifyJwt: time claims (clock injected, JWT times are in seconds)", () => {
  it("accepts a token one second before it expires", () => {
    const token = forge();
    expect(verifyAt({ token, nowSeconds: NOW_SECONDS + TEN_MINUTES - 1 }).sub).toBe("user-1");
  });

  it("rejects a token at the exact second in exp", () => {
    expect(() => verifyAt({ token: forge(), nowSeconds: NOW_SECONDS + TEN_MINUTES })).toThrow();
  });

  it("rejects a token long after exp", () => {
    expect(() => verifyAt({ token: forge(), nowSeconds: NOW_SECONDS + TEN_MINUTES * 100 })).toThrow();
  });

  it("rejects a token with no exp, because it would live forever", () => {
    const { exp, ...withoutExp } = validClaims();
    expect(() => verifyAt({ token: forge({ claims: withoutExp }) })).toThrow();
  });

  it("rejects an exp that is text instead of a number, even when the signature is valid", () => {
    expect(() => verifyAt({ token: forge({ claims: validClaims({ exp: String(NOW_SECONDS + TEN_MINUTES) as unknown as number }) }) })).toThrow();
    expect(() => verifyAt({ token: forge({ claims: validClaims({ exp: "9999999999" as unknown as number }) }) })).toThrow();
  });

  it("rejects a token before its nbf and accepts it at nbf", () => {
    const token = forge({ claims: validClaims({ nbf: NOW_SECONDS + 60 }) });
    expect(() => verifyAt({ token, nowSeconds: NOW_SECONDS + 59 })).toThrow();
    expect(verifyAt({ token, nowSeconds: NOW_SECONDS + 60 }).sub).toBe("user-1");
  });
});

describe("verifyJwt: issuer and audience", () => {
  it("rejects a token from another issuer", () => {
    expect(() => verifyAt({ token: forge({ claims: validClaims({ iss: "https://evil.example.com" }) }) })).toThrow();
  });

  it("rejects an issuer that only looks like ours (longer, shorter or with a suffix)", () => {
    for (const iss of [`${ISSUER}.evil.io`, `${ISSUER}/`, ISSUER.slice(0, -1), ISSUER.toUpperCase()]) {
      expect(() => verifyAt({ token: forge({ claims: validClaims({ iss }) }) })).toThrow();
    }
  });

  it("rejects a token with no issuer", () => {
    const { iss, ...withoutIssuer } = validClaims();
    expect(() => verifyAt({ token: forge({ claims: withoutIssuer }) })).toThrow();
  });

  it("rejects a token meant for another audience", () => {
    expect(() => verifyAt({ token: forge({ claims: validClaims({ aud: "billing-api" }) }) })).toThrow();
    expect(() => verifyAt({ token: forge({ claims: validClaims({ aud: ["billing-api", "reports-api"] }) }) })).toThrow();
  });

  it("rejects an audience that only contains ours as part of a longer name", () => {
    for (const aud of [`${AUDIENCE}-v2`, `my-${AUDIENCE}`, [`${AUDIENCE}-admin`, "billing-api"]]) {
      expect(() => verifyAt({ token: forge({ claims: validClaims({ aud }) }) })).toThrow();
    }
  });

  it("rejects a token with no audience", () => {
    const { aud, ...withoutAudience } = validClaims();
    expect(() => verifyAt({ token: forge({ claims: withoutAudience }) })).toThrow();
  });
});
