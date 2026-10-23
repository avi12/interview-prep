import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { createSeededPicker } from "#kit/random.ts";
import { measureMs } from "#kit/timing.ts";

type Module = { twoSum: (numbers: number[], target: number) => number[] };

const { twoSum } = await loadImpl<Module>({ testUrl: import.meta.url, file: "twoSum.ts" });

const sortedPair = (pair: number[]) => [...pair].sort((a, b) => a - b);
const LARGE_SIZE = 200_000;
const TIME_LIMIT_MS = 1000;
const RANDOM_SEED = 20_240_601;
const RANDOM_CASE_COUNT = 300;
const RANDOM_MAX_LENGTH = 12;
const RANDOM_VALUE_SPAN = 21;
const RANDOM_VALUE_FLOOR = -10;
const RANDOM_TARGET_SPAN = 41;
const RANDOM_TARGET_FLOOR = -20;

const hasPairWithSum = ({ numbers, target }: { numbers: number[]; target: number }) =>
  numbers.some((first, i) => numbers.some((second, j) => i < j && first + second === target));

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

  it("does not change the numbers it was given", () => {
    const numbers = Object.freeze([11, 7, 2, 15]) as number[];
    expect(sortedPair(twoSum(numbers, 9))).toEqual([1, 2]);
    expect(numbers).toEqual([11, 7, 2, 15]);
  });

  it("returns two different valid positions that add up to the target, and [] when no pair exists", () => {
    const random = createSeededPicker(RANDOM_SEED);
    for (let caseNumber = 0; caseNumber < RANDOM_CASE_COUNT; caseNumber++) {
      const length = random(RANDOM_MAX_LENGTH + 1);
      const numbers = Array.from({ length }, () => random(RANDOM_VALUE_SPAN) + RANDOM_VALUE_FLOOR);
      const target = random(RANDOM_TARGET_SPAN) + RANDOM_TARGET_FLOOR;
      const pair = twoSum([...numbers], target);
      if (!hasPairWithSum({ numbers, target })) {
        expect(pair, `numbers ${JSON.stringify(numbers)} target ${target}`).toEqual([]);
        continue;
      }
      const [first, second] = pair;
      expect(pair, `numbers ${JSON.stringify(numbers)} target ${target}`).toHaveLength(2);
      expect(first).not.toBe(second);
      expect(numbers[first] + numbers[second]).toBe(target);
    }
  });

  it("stays fast on 200,000 numbers (O(n), not O(n squared))", () => {
    const numbers = Array.from({ length: LARGE_SIZE }, (_, i) => i);
    const target = numbers[LARGE_SIZE - 1] + numbers[LARGE_SIZE - 2];
    const { result: pair, elapsedMs } = measureMs(() => twoSum(numbers, target));
    expect(elapsedMs).toBeLessThan(TIME_LIMIT_MS);
    expect(sortedPair(pair)).toEqual([LARGE_SIZE - 2, LARGE_SIZE - 1]);
  });
});
