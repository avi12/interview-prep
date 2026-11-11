import { apiKeySchema, clearGeminiKey, loadGeminiKey, saveGeminiKey } from "@/lib/gemini-key.ts";
import { MemoryStorage } from "@/test/memory-storage.ts";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const VALID_KEY = "AIzaSyExampleKeyWithEnoughLength123";

describe("gemini key", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts a key without spaces and long enough, trimmed", () => {
    expect(apiKeySchema.parse(`  ${VALID_KEY}  `)).toBe(VALID_KEY);
  });

  it("rejects short keys and keys with spaces", () => {
    expect(apiKeySchema.safeParse("short").success).toBe(false);
    expect(apiKeySchema.safeParse(`${VALID_KEY} ${VALID_KEY}`).success).toBe(false);
  });

  it("stores and clears the key", () => {
    expect(loadGeminiKey()).toBeNull();
    expect(saveGeminiKey(VALID_KEY)).toBe(true);
    expect(loadGeminiKey()).toBe(VALID_KEY);
    clearGeminiKey();
    expect(loadGeminiKey()).toBeNull();
  });

  it("refuses to store an invalid key", () => {
    expect(saveGeminiKey("nope")).toBe(false);
    expect(loadGeminiKey()).toBeNull();
  });
});
