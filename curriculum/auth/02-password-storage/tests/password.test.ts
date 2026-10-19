import { scryptSync, timingSafeEqual } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { loadImpl } from "#kit/impl.ts";

vi.mock("node:crypto", async importOriginal => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  const timingSafeEqual = vi.fn(actual.timingSafeEqual);
  return { ...actual, timingSafeEqual, default: { ...actual, timingSafeEqual } };
});

type Params = { cost: number; blockSize: number; parallelization: number };
type Module = {
  hashPassword: (input: { password: string; salt?: Buffer; params?: Params }) => Promise<string>;
  verifyPassword: (input: { password: string; stored: string }) => Promise<boolean>;
};

const { hashPassword, verifyPassword } = await loadImpl<Module>({ testUrl: import.meta.url, file: "password.ts" });

const PASSWORD = "correct horse battery staple";
const SALT = Buffer.from("0123456789abcdef");
const KEY_BYTES = 32;
const DEFAULT_COST = 2 ** 14;
const CHEAP_PARAMS = { cost: 2 ** 10, blockSize: 8, parallelization: 1 };
const OWASP_MINIMUM_PARAMS = { cost: 2 ** 17, blockSize: 8, parallelization: 1 };
const BCRYPT_LIMIT = 72;
const GARBAGE_STORED_VALUES = ["", "plain-text", "bcrypt$12$abc$def$ghi$jkl", "scrypt$16384$8$1$onlysalt", "scrypt$abc$8$1$c2FsdA==$aGFzaA=="];

const expectedStored = ({ password, salt, params }: { password: string; salt: Buffer; params: Params }) => {
  const key = scryptSync(password, salt, KEY_BYTES, { N: params.cost, r: params.blockSize, p: params.parallelization });
  return ["scrypt", params.cost, params.blockSize, params.parallelization, salt.toString("base64"), key.toString("base64")].join("$");
};

describe("hashPassword", () => {
  it("stores scrypt$cost$blockSize$parallelization$salt$hash, with base64 salt and a 32 byte hash", async () => {
    const params = { cost: DEFAULT_COST, blockSize: 8, parallelization: 1 };
    const stored = await hashPassword({ password: PASSWORD, salt: SALT });
    expect(stored).toBe(expectedStored({ password: PASSWORD, salt: SALT, params }));
  });

  it("writes the settings it used into the string, so they can change later", async () => {
    const stored = await hashPassword({ password: PASSWORD, salt: SALT, params: CHEAP_PARAMS });
    expect(stored.startsWith(`scrypt$${CHEAP_PARAMS.cost}$8$1$`)).toBe(true);
  });

  it("never contains the plain password", async () => {
    const stored = await hashPassword({ password: PASSWORD });
    expect(stored).not.toContain(PASSWORD);
  });

  it("uses a fresh random salt, so the same password gives different strings", async () => {
    const first = await hashPassword({ password: PASSWORD });
    const second = await hashPassword({ password: PASSWORD });
    expect(first).not.toBe(second);
  });
});

describe("verifyPassword", () => {
  it("accepts the right password", async () => {
    const stored = await hashPassword({ password: PASSWORD });
    expect(await verifyPassword({ password: PASSWORD, stored })).toBe(true);
  });

  it("rejects a wrong password, even one that differs by a single letter", async () => {
    const stored = await hashPassword({ password: PASSWORD });
    expect(await verifyPassword({ password: "Correct horse battery staple", stored })).toBe(false);
    expect(await verifyPassword({ password: "", stored })).toBe(false);
  });

  it("reads the settings from the stored string, not from today's defaults", async () => {
    const stored = await hashPassword({ password: PASSWORD, params: CHEAP_PARAMS });
    expect(await verifyPassword({ password: PASSWORD, stored })).toBe(true);
  });

  it("returns false, and does not throw, for strings that are not hashes", async () => {
    for (const stored of GARBAGE_STORED_VALUES) {
      expect(await verifyPassword({ password: PASSWORD, stored })).toBe(false);
    }
  });

  it("compares with crypto.timingSafeEqual, not with ===", async () => {
    const stored = await hashPassword({ password: PASSWORD });
    vi.mocked(timingSafeEqual).mockClear();
    await verifyPassword({ password: PASSWORD, stored });
    expect(timingSafeEqual).toHaveBeenCalled();
  });

  it("reads the whole password, unlike bcrypt which stops at 72 bytes", async () => {
    const longPassword = "a".repeat(BCRYPT_LIMIT) + "first";
    const stored = await hashPassword({ password: longPassword });
    expect(await verifyPassword({ password: longPassword, stored })).toBe(true);
    expect(await verifyPassword({ password: "a".repeat(BCRYPT_LIMIT) + "other", stored })).toBe(false);
  });

  it("handles non-ASCII passwords", async () => {
    const hebrewPassword = "סיסמה-חזקה-123";
    const stored = await hashPassword({ password: hebrewPassword });
    expect(await verifyPassword({ password: hebrewPassword, stored })).toBe(true);
  });

  it("works at the OWASP minimum cost of 2^17, which needs a bigger maxmem than the default", async () => {
    const stored = await hashPassword({ password: PASSWORD, params: OWASP_MINIMUM_PARAMS });
    expect(await verifyPassword({ password: PASSWORD, stored })).toBe(true);
  });
});
