import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { measureMs } from "#kit/timing.ts";

type Module = { hasDuplicate: (numbers: number[]) => boolean };

const { hasDuplicate } = await loadImpl<Module>({ testUrl: import.meta.url, file: "hasDuplicate.ts" });

const LARGE_SIZE = 200_000;
const TIME_LIMIT_MS = 1000;

describe("hasDuplicate", () => {
  it("finds a repeated number", () => {
    expect(hasDuplicate([1, 2, 3, 1])).toBe(true);
  });

  it("returns false when all numbers are different", () => {
    expect(hasDuplicate([1, 2, 3, 4])).toBe(false);
  });

  it("finds a repeat at the very end", () => {
    expect(hasDuplicate([5, 6, 7, 5])).toBe(true);
  });

  it("returns false for an empty list and a single number", () => {
    expect(hasDuplicate([])).toBe(false);
    expect(hasDuplicate([4])).toBe(false);
  });

  it("treats zero and negatives as normal numbers", () => {
    expect(hasDuplicate([0, -1, 0])).toBe(true);
    expect(hasDuplicate([-1, 1, 0])).toBe(false);
  });

  it("does not change the list it was given", () => {
    const numbers = Object.freeze([3, 1, 3]) as number[];
    expect(hasDuplicate(numbers)).toBe(true);
    expect(numbers).toEqual([3, 1, 3]);
  });

  it("stays fast on 200,000 different numbers (O(n), not O(n squared))", () => {
    const numbers = Array.from({ length: LARGE_SIZE }, (_, i) => i);
    const { result, elapsedMs } = measureMs(() => hasDuplicate(numbers));
    expect(elapsedMs).toBeLessThan(TIME_LIMIT_MS);
    expect(result).toBe(false);
  });
});
