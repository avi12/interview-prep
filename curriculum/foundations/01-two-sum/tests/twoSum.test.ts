import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Module = { twoSum: (numbers: number[], target: number) => number[] };

const { twoSum } = await loadImpl<Module>({ testUrl: import.meta.url, file: "twoSum.ts" });

const sortedPair = (pair: number[]) => [...pair].sort((a, b) => a - b);
const LARGE_SIZE = 200_000;
const TIME_LIMIT_MS = 1000;

describe("twoSum", () => {
  it("finds the pair in the simplest case", () => {
    expect(sortedPair(twoSum([2, 7, 11, 15], 9))).toEqual([0, 1]);
  });

  it("finds a pair that is not at the start", () => {
    expect(sortedPair(twoSum([3, 2, 4], 6))).toEqual([1, 2]);
  });

  it("does not use the same element twice", () => {
    expect(sortedPair(twoSum([3, 3], 6))).toEqual([0, 1]);
    expect(sortedPair(twoSum([3, 2], 6))).toEqual([]);
  });

  it("handles negatives and zero", () => {
    expect(sortedPair(twoSum([-3, 4, 3, 90], 0))).toEqual([0, 2]);
  });

  it("returns an empty array when there is no pair", () => {
    expect(twoSum([1, 2, 3], 100)).toEqual([]);
  });

  it("stays fast on 200,000 numbers (O(n), not O(n squared))", () => {
    const numbers = Array.from({ length: LARGE_SIZE }, (_, i) => i);
    const target = numbers[LARGE_SIZE - 1] + numbers[LARGE_SIZE - 2];
    const startedAt = performance.now();
    const pair = twoSum(numbers, target);
    expect(performance.now() - startedAt).toBeLessThan(TIME_LIMIT_MS);
    expect(sortedPair(pair)).toEqual([LARGE_SIZE - 2, LARGE_SIZE - 1]);
  });
});
