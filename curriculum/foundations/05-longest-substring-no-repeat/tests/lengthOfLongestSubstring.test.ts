import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Module = { lengthOfLongestSubstring: (text: string) => number };

const { lengthOfLongestSubstring } = await loadImpl<Module>({ testUrl: import.meta.url, file: "lengthOfLongestSubstring.ts" });

const FIRST_CJK_CODE = 0x4e00;
const DISTINCT_CHAR_COUNT = 4_000;
const REPEAT_COUNT = 5;
const TIME_LIMIT_MS = 150;

describe("lengthOfLongestSubstring", () => {
  it("finds a window at the start", () => {
    expect(lengthOfLongestSubstring("abcabcbb")).toBe(3);
  });

  it("handles one repeated character", () => {
    expect(lengthOfLongestSubstring("bbbbb")).toBe(1);
  });

  it("finds a window in the middle", () => {
    expect(lengthOfLongestSubstring("pwwkew")).toBe(3);
  });

  it("returns 0 for the empty string", () => {
    expect(lengthOfLongestSubstring("")).toBe(0);
  });

  it("counts a single space as a character", () => {
    expect(lengthOfLongestSubstring(" ")).toBe(1);
  });

  it("returns the whole length when nothing repeats", () => {
    expect(lengthOfLongestSubstring("abcdefg")).toBe(7);
    expect(lengthOfLongestSubstring("au")).toBe(2);
  });

  it("restarts after the first copy of the repeat, not at the repeat itself", () => {
    expect(lengthOfLongestSubstring("dvdf")).toBe(3);
    expect(lengthOfLongestSubstring("anviaj")).toBe(5);
  });

  it("never moves the window start backwards when an old repeat is outside the window", () => {
    expect(lengthOfLongestSubstring("abba")).toBe(2);
    expect(lengthOfLongestSubstring("tmmzuxt")).toBe(5);
  });

  it("treats upper and lower case, digits and symbols as different characters", () => {
    expect(lengthOfLongestSubstring("aA")).toBe(2);
    expect(lengthOfLongestSubstring("a1!a1!")).toBe(3);
  });

  it("stays fast on 20,000 characters with a 4,000 character window (O(n), not a rescan from every start)", () => {
    const distinct = Array.from({ length: DISTINCT_CHAR_COUNT }, (_, i) => String.fromCharCode(FIRST_CJK_CODE + i)).join("");
    const text = distinct.repeat(REPEAT_COUNT);
    const startedAt = performance.now();
    const length = lengthOfLongestSubstring(text);
    expect(performance.now() - startedAt).toBeLessThan(TIME_LIMIT_MS);
    expect(length).toBe(DISTINCT_CHAR_COUNT);
  });
});
