import { timingSafeEqual } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import type { GetRandomBytes } from "#kit/nodeCrypto.ts";

vi.mock("node:crypto", async importOriginal =>
  (await import("#kit/nodeCrypto.ts")).withSpiedTimingSafeEqual(await importOriginal<typeof import("node:crypto")>())
);

type Module = {
  escapeHtml: (text: string) => string;
  createCsrfToken: (input?: { getRandomBytes?: GetRandomBytes }) => string;
  isCsrfRequestAllowed: (input: { method: string; sessionToken: string; submittedToken: string | undefined }) => boolean;
};

const { escapeHtml, createCsrfToken, isCsrfRequestAllowed } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "defenses.ts"
});

const SESSION_TOKEN = "c2Vzc2lvbi10b2tlbi1mb3ItdGVzdHM";
const MIN_TOKEN_LENGTH = 43;
const TOKEN_COUNT = 200;
const STATE_CHANGING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];
const XSS_PAYLOADS = [
  "<script>alert(1)</script>",
  '<img src=x onerror="alert(1)">',
  "' onmouseover='alert(1)",
  '" autofocus onfocus="alert(1)',
  "</textarea><svg/onload=alert(1)>",
  "<a href='javascript:alert(1)'>click</a>"
];

describe("escapeHtml", () => {
  it("turns a script tag into harmless text", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("escapes an ampersand", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("escapes each character once, not twice (the & must not be re-escaped)", () => {
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml('"')).toBe("&quot;");
  });

  it("escapes text that already looks like an entity, because it is text, not markup", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("escapes both kinds of quote, so a value cannot break out of an attribute", () => {
    expect(escapeHtml('x" onmouseover="alert(1)')).toBe("x&quot; onmouseover=&quot;alert(1)");
    expect(escapeHtml("x' onmouseover='alert(1)")).toBe("x&#x27; onmouseover=&#x27;alert(1)");
  });

  it("leaves safe text alone, including other alphabets", () => {
    expect(escapeHtml("hello world 123")).toBe("hello world 123");
    expect(escapeHtml("שלום עולם")).toBe("שלום עולם");
    expect(escapeHtml("a/b=c`d(e);f")).toBe("a/b=c`d(e);f");
  });

  it("leaves no raw angle bracket or quote in the output of known attack strings", () => {
    for (const payload of XSS_PAYLOADS) {
      expect(escapeHtml(payload)).not.toMatch(/[<>"']/);
    }
  });

  it("handles an empty string and a long string", () => {
    expect(escapeHtml("")).toBe("");
    expect(escapeHtml("<".repeat(10_000))).toBe("&lt;".repeat(10_000));
  });
});

describe("createCsrfToken", () => {
  it("is 256 bits of randomness written in URL-safe base64", () => {
    const token = createCsrfToken({ getRandomBytes: size => Buffer.alloc(size, 7) });
    expect(token).toBe(Buffer.alloc(32, 7).toString("base64url"));
  });

  it("is long enough and URL-safe by default", () => {
    const token = createCsrfToken();
    expect(token.length).toBeGreaterThanOrEqual(MIN_TOKEN_LENGTH);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("is different every time", () => {
    const tokens = new Set(Array.from({ length: TOKEN_COUNT }, () => createCsrfToken()));
    expect(tokens.size).toBe(TOKEN_COUNT);
  });
});

describe("isCsrfRequestAllowed", () => {
  it("lets safe methods through without a token, in any letter case", () => {
    for (const method of [...SAFE_METHODS, "get", "Head"]) {
      expect(isCsrfRequestAllowed({ method, sessionToken: SESSION_TOKEN, submittedToken: undefined })).toBe(true);
    }
  });

  it("lets a state-changing request through when the submitted token matches the session token", () => {
    for (const method of STATE_CHANGING_METHODS) {
      expect(isCsrfRequestAllowed({ method, sessionToken: SESSION_TOKEN, submittedToken: SESSION_TOKEN })).toBe(true);
    }
  });

  it("blocks a state-changing request with no token (the cross-site form attack)", () => {
    for (const method of STATE_CHANGING_METHODS) {
      expect(isCsrfRequestAllowed({ method, sessionToken: SESSION_TOKEN, submittedToken: undefined })).toBe(false);
      expect(isCsrfRequestAllowed({ method, sessionToken: SESSION_TOKEN, submittedToken: "" })).toBe(false);
    }
  });

  it("blocks a lowercase post, because method names are case-insensitive", () => {
    expect(isCsrfRequestAllowed({ method: "post", sessionToken: SESSION_TOKEN, submittedToken: undefined })).toBe(false);
  });

  it("blocks a wrong token", () => {
    expect(isCsrfRequestAllowed({ method: "POST", sessionToken: SESSION_TOKEN, submittedToken: "d3Jvbmc" })).toBe(false);
  });

  it("blocks a wrong token that has the right length", () => {
    const sameLength = `${SESSION_TOKEN.slice(0, -1)}X`;
    expect(sameLength).toHaveLength(SESSION_TOKEN.length);
    expect(isCsrfRequestAllowed({ method: "POST", sessionToken: SESSION_TOKEN, submittedToken: sameLength })).toBe(false);
    expect(isCsrfRequestAllowed({ method: "POST", sessionToken: SESSION_TOKEN, submittedToken: SESSION_TOKEN.toUpperCase() })).toBe(false);
  });

  it("compares the tokens with crypto.timingSafeEqual, not with ===", () => {
    vi.mocked(timingSafeEqual).mockClear();
    isCsrfRequestAllowed({ method: "POST", sessionToken: SESSION_TOKEN, submittedToken: SESSION_TOKEN });
    expect(timingSafeEqual).toHaveBeenCalled();
  });

  it("blocks a token of a different length without throwing", () => {
    expect(isCsrfRequestAllowed({ method: "POST", sessionToken: SESSION_TOKEN, submittedToken: SESSION_TOKEN + "x" })).toBe(false);
    expect(isCsrfRequestAllowed({ method: "POST", sessionToken: SESSION_TOKEN, submittedToken: SESSION_TOKEN.slice(0, 5) })).toBe(false);
  });

  it("never matches an empty session token with an empty submitted token", () => {
    expect(isCsrfRequestAllowed({ method: "POST", sessionToken: "", submittedToken: "" })).toBe(false);
    expect(isCsrfRequestAllowed({ method: "POST", sessionToken: "", submittedToken: undefined })).toBe(false);
  });

  it("treats a method it does not know as state-changing (deny by default)", () => {
    expect(isCsrfRequestAllowed({ method: "PROPFIND", sessionToken: SESSION_TOKEN, submittedToken: undefined })).toBe(false);
  });
});
