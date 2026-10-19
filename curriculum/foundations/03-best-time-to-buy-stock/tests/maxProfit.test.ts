import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Module = { maxProfit: (prices: number[]) => number };

const { maxProfit } = await loadImpl<Module>({ testUrl: import.meta.url, file: "maxProfit.ts" });

const LARGE_SIZE = 20_000;
const HALF_SIZE = LARGE_SIZE / 2;
const READS_PER_PRICE_LIMIT = 10;
const INDEX_KEY_PATTERN = /^\d+$/;

const withReadLimit = (prices: number[]) => {
  const readLimit = prices.length * READS_PER_PRICE_LIMIT;
  let readCount = 0;
  return new Proxy(prices, {
    get(target, key, receiver) {
      if (typeof key === "string" && INDEX_KEY_PATTERN.test(key)) readCount++;
      if (readCount > readLimit) {
        throw new Error(`Read prices ${readCount} times for ${prices.length} prices. One pass reads each price a few times, not once per pair of days.`);
      }
      return Reflect.get(target, key, receiver);
    }
  });
};

describe("maxProfit", () => {
  it("buys low and sells high later", () => {
    expect(maxProfit([7, 1, 5, 3, 6, 4])).toBe(5);
  });

  it("returns 0 when the price only falls", () => {
    expect(maxProfit([7, 6, 4, 3, 1])).toBe(0);
  });

  it("returns 0 when there is nothing to trade", () => {
    expect(maxProfit([])).toBe(0);
    expect(maxProfit([5])).toBe(0);
  });

  it("returns 0 when the price never changes", () => {
    expect(maxProfit([5, 5, 5, 5])).toBe(0);
  });

  it("cannot sell before it buys: the cheapest day may come after the best day", () => {
    expect(maxProfit([10, 1])).toBe(0);
    expect(maxProfit([2, 4, 1])).toBe(2);
    expect(maxProfit([3, 2, 6, 5, 0, 3])).toBe(4);
  });

  it("finds the best profit when the lowest price is not the first price", () => {
    expect(maxProfit([9, 8, 2, 3, 10, 1, 4])).toBe(8);
  });

  it("works with a profit that comes from the very last day", () => {
    expect(maxProfit([3, 3, 3, 9])).toBe(6);
  });

  it("makes one pass over 20,000 prices (O(n), not a check of every pair of days)", () => {
    const prices = Array.from({ length: LARGE_SIZE }, (_, day) => Math.abs(day - HALF_SIZE) + 1);
    expect(maxProfit(withReadLimit(prices))).toBe(HALF_SIZE - 1);
  });
});
