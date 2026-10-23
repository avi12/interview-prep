import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { createSeededPicker } from "#kit/random.ts";
import { measureMs } from "#kit/timing.ts";

type Module = { lengthOfLongestSubstring: (text: string) => number };

const { lengthOfLongestSubstring } = await loadImpl<Module>({ testUrl: import.meta.url, file: "lengthOfLongestSubstring.ts" });

const FIRST_CJK_CODE = 0x4e00;
const DISTINCT_CHAR_COUNT = 4_000;
const REPEAT_COUNT = 5;
const TIME_LIMIT_MS = 150;
const RANDOM_SEED = 20_240_605;
const RANDOM_CASE_COUNT = 400;
const RANDOM_MAX_LENGTH = 16;
const RANDOM_ALPHABETS = ["ab", "abcd", "abcdefgh", "aAbB1! "];

const longestWithoutRepeatByRescanning = (text: string) => {
  let longest = 0;
  for (let start = 0; start < text.length; start++) {
    let end = start;
    while (end < text.length && !text.slice(start, end).includes(text[end])) end++;
    longest = Math.max(longest, end - start);
  }
  return longest;
};

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

  it("agrees with a slow rescan from every start on random texts", () => {
    const random = createSeededPicker(RANDOM_SEED);
    for (let caseNumber = 0; caseNumber < RANDOM_CASE_COUNT; caseNumber++) {
      const alphabet = RANDOM_ALPHABETS[random(RANDOM_ALPHABETS.length)];
      const text = Array.from({ length: random(RANDOM_MAX_LENGTH + 1) }, () => alphabet[random(alphabet.length)]).join("");
      expect(lengthOfLongestSubstring(text), `text ${JSON.stringify(text)}`).toBe(longestWithoutRepeatByRescanning(text));
    }
  });

  it("stays fast on 20,000 characters with a 4,000 character window (O(n), not a rescan from every start)", () => {
    const distinct = Array.from({ length: DISTINCT_CHAR_COUNT }, (_, i) => String.fromCharCode(FIRST_CJK_CODE + i)).join("");
    const text = distinct.repeat(REPEAT_COUNT);
    const { result: length, elapsedMs } = measureMs(() => lengthOfLongestSubstring(text));
    expect(elapsedMs).toBeLessThan(TIME_LIMIT_MS);
    expect(length).toBe(DISTINCT_CHAR_COUNT);
  });
});
