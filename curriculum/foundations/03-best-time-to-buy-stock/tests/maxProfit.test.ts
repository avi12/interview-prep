import { loadImpl } from "#kit/impl.ts";
import { createSeededPicker } from "#kit/random.ts";
import { measureMs } from "#kit/timing.ts";
import { describe, expect, it } from "vitest";

type Module = { maxProfit: (prices: number[]) => number };

const { maxProfit } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "maxProfit.ts"
});

const LARGE_SIZE = 20_000;
const HALF_SIZE = LARGE_SIZE / 2;
const READS_PER_PRICE_LIMIT = 10;
const COPY_PROOF_SIZE = 30_000;
const COPY_PROOF_LIMIT_MS = 100;
const RANDOM_SEED = 20_240_602;
const RANDOM_CASE_COUNT = 300;
const RANDOM_MAX_LENGTH = 10;
const RANDOM_PRICE_SPAN = 20;

function bestProfitOfEveryPair(prices: number[]) {
  let best = 0;
  for (const [buyDay, buyPrice] of prices.entries()) {
    for (const sellPrice of prices.slice(buyDay + 1)) {
      best = Math.max(best, sellPrice - buyPrice);
    }
  }
  return best;
}

function withReadLimit(prices: number[]) {
  const readLimit = prices.length * READS_PER_PRICE_LIMIT;
  let readCount = 0;
  const countedPrices: number[] = [];
  for (const [day, price] of prices.entries()) {
    Object.defineProperty(countedPrices, day, {
      enumerable: true,
      get() {
        readCount++;

        if (readCount > readLimit) {
          throw new Error(`Read prices ${readCount} times for ${prices.length} prices. One pass reads each price a few times, not once per pair of days.`);
        }

        return price;
      }
    });
  }
  return countedPrices;
}

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

  it("does not change the prices it was given", () => {
    const prices = [7, 1, 5, 3, 6, 4];
    Object.freeze(prices);
    expect(maxProfit(prices)).toBe(5);
    expect(prices).toEqual([7, 1, 5, 3, 6, 4]);
  });

  it("agrees with a check of every pair of days on random prices", () => {
    const random = createSeededPicker(RANDOM_SEED);
    for (let caseNumber = 0; caseNumber < RANDOM_CASE_COUNT; caseNumber++) {
      const prices = Array.from({ length: random(RANDOM_MAX_LENGTH + 1) }, () => random(RANDOM_PRICE_SPAN) + 1);
      expect(maxProfit([...prices]), `prices ${JSON.stringify(prices)}`).toBe(bestProfitOfEveryPair(prices));
    }
  });

  it("makes one pass over 20,000 prices (O(n), not a check of every pair of days)", () => {
    const prices = Array.from({ length: LARGE_SIZE }, (_, day) => Math.abs(day - HALF_SIZE) + 1);
    expect(maxProfit(withReadLimit(prices))).toBe(HALF_SIZE - 1);
  });

  it("stays fast on 30,000 prices even when you copy them first", () => {
    const prices = Array.from({ length: COPY_PROOF_SIZE }, (_, day) => COPY_PROOF_SIZE - day);
    prices.push(COPY_PROOF_SIZE * 2);
    const { result: profit, elapsedMs } = measureMs(() => maxProfit(prices));
    expect(elapsedMs).toBeLessThan(COPY_PROOF_LIMIT_MS);
    expect(profit).toBe(COPY_PROOF_SIZE * 2 - 1);
  });
});
