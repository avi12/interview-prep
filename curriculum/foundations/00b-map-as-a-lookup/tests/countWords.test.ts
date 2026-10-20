import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { measureMs } from "#kit/timing.ts";

type Module = { countWords: (words: string[]) => Map<string, number> };

const { countWords } = await loadImpl<Module>({ testUrl: import.meta.url, file: "countWords.ts" });

const LARGE_SIZE = 200_000;
const DISTINCT_WORDS = 1000;
const TIME_LIMIT_MS = 1000;

describe("countWords", () => {
  it("counts repeated words", () => {
    const counts = countWords(["a", "b", "a", "a"]);
    expect(counts.get("a")).toBe(3);
    expect(counts.get("b")).toBe(1);
  });

  it("returns a Map", () => {
    expect(countWords(["x"])).toBeInstanceOf(Map);
  });

  it("has one entry per distinct word", () => {
    expect(countWords(["a", "b", "a"]).size).toBe(2);
  });

  it("returns an empty map for an empty list", () => {
    expect(countWords([]).size).toBe(0);
  });

  it("does not mix up similar words", () => {
    const counts = countWords(["cat", "Cat", "cat"]);
    expect(counts.get("cat")).toBe(2);
    expect(counts.get("Cat")).toBe(1);
  });

  it("treats built-in object names as ordinary words", () => {
    const counts = countWords(["constructor", "toString", "constructor"]);
    expect(counts.get("constructor")).toBe(2);
    expect(counts.get("toString")).toBe(1);
  });

  it("stays fast on 200,000 words (O(n), not O(n squared))", () => {
    const words = Array.from({ length: LARGE_SIZE }, (_, i) => `w${i % DISTINCT_WORDS}`);
    const { result: counts, elapsedMs } = measureMs(() => countWords(words));
    expect(elapsedMs).toBeLessThan(TIME_LIMIT_MS);
    expect(counts.get("w0")).toBe(LARGE_SIZE / DISTINCT_WORDS);
  });
});
