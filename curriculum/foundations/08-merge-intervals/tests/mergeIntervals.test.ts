import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Module = { mergeIntervals: (intervals: number[][]) => number[][] };

const { mergeIntervals } = await loadImpl<Module>({ testUrl: import.meta.url, file: "mergeIntervals.ts" });

const LARGE_SIZE = 30_000;
const SHUFFLE_STRIDE = 7_919;
const TIME_LIMIT_MS = 300;

const shuffledIndexes = () => Array.from({ length: LARGE_SIZE }, (_, i) => (i * SHUFFLE_STRIDE) % LARGE_SIZE);

describe("mergeIntervals", () => {
  it("merges overlapping intervals and keeps the separate ones", () => {
    expect(mergeIntervals([[1, 3], [2, 6], [8, 10], [15, 18]])).toEqual([[1, 6], [8, 10], [15, 18]]);
  });

  it("merges intervals that only touch at an end", () => {
    expect(mergeIntervals([[1, 4], [4, 5]])).toEqual([[1, 5]]);
  });

  it("sorts intervals that arrive out of order", () => {
    expect(mergeIntervals([[8, 10], [1, 3], [15, 18], [2, 6]])).toEqual([[1, 6], [8, 10], [15, 18]]);
  });

  it("sorts by number, not by text (10 comes after 2)", () => {
    expect(mergeIntervals([[10, 12], [2, 6], [1, 3]])).toEqual([[1, 6], [10, 12]]);
  });

  it("keeps the larger end when one interval sits inside another", () => {
    expect(mergeIntervals([[1, 10], [2, 3], [4, 5]])).toEqual([[1, 10]]);
    expect(mergeIntervals([[1, 5], [2, 3]])).toEqual([[1, 5]]);
  });

  it("lets a late wide interval swallow everything before it", () => {
    expect(mergeIntervals([[2, 3], [4, 5], [6, 7], [8, 9], [1, 10]])).toEqual([[1, 10]]);
  });

  it("handles a chain where each interval overlaps only the next one", () => {
    expect(mergeIntervals([[1, 3], [3, 5], [5, 7], [7, 9]])).toEqual([[1, 9]]);
  });

  it("handles intervals that start at the same number", () => {
    expect(mergeIntervals([[1, 4], [0, 4]])).toEqual([[0, 4]]);
    expect(mergeIntervals([[1, 4], [1, 4]])).toEqual([[1, 4]]);
    expect(mergeIntervals([[1, 2], [1, 9], [1, 5]])).toEqual([[1, 9]]);
  });

  it("handles negative numbers", () => {
    expect(mergeIntervals([[-5, -2], [-3, 1], [4, 6]])).toEqual([[-5, 1], [4, 6]]);
  });

  it("handles no intervals and one interval", () => {
    expect(mergeIntervals([])).toEqual([]);
    expect(mergeIntervals([[4, 7]])).toEqual([[4, 7]]);
  });

  it("leaves intervals that do not overlap exactly as they are", () => {
    expect(mergeIntervals([[1, 2], [4, 5], [7, 8]])).toEqual([[1, 2], [4, 5], [7, 8]]);
  });

  it("does not change the array it was given", () => {
    const intervals = [[8, 10], [1, 3], [2, 6]];
    mergeIntervals(intervals);
    expect(intervals).toEqual([[8, 10], [1, 3], [2, 6]]);
  });

  it("stays fast on 30,000 separate intervals in shuffled order (O(n log n), not O(n squared))", () => {
    const intervals = shuffledIndexes().map(i => [i * 2, i * 2 + 1]);
    const startedAt = performance.now();
    const merged = mergeIntervals(intervals);
    expect(performance.now() - startedAt).toBeLessThan(TIME_LIMIT_MS);
    expect(merged).toHaveLength(LARGE_SIZE);
    expect(merged[0]).toEqual([0, 1]);
    expect(merged.at(-1)).toEqual([(LARGE_SIZE - 1) * 2, (LARGE_SIZE - 1) * 2 + 1]);
  });

  it("stays fast on 30,000 shuffled intervals that all merge into one", () => {
    const intervals = shuffledIndexes().map(i => [i, i + 2]);
    const startedAt = performance.now();
    const merged = mergeIntervals(intervals);
    expect(performance.now() - startedAt).toBeLessThan(TIME_LIMIT_MS);
    expect(merged).toEqual([[0, LARGE_SIZE + 1]]);
  });
});
