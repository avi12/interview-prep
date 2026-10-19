import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { measureMs } from "#kit/timing.ts";

type Module = { climbStairs: (n: number) => number };

const { climbStairs } = await loadImpl<Module>({ testUrl: import.meta.url, file: "climbStairs.ts" });

const LARGEST_STAIRCASE = 45;
const WAYS_FOR_LARGEST_STAIRCASE = 1_836_311_903;
const TIME_LIMIT_MS = 1000;
const SEQUENCE_CHECK_LIMIT = 35;

const waysUpTo = (steps: number) => {
  const ways = [1, 1];
  for (let step = 2; step <= steps; step++) ways.push(ways[step - 1] + ways[step - 2]);
  return ways;
};

describe("climbStairs", () => {
  it("has one way to climb one step", () => {
    expect(climbStairs(1)).toBe(1);
  });

  it("has two ways to climb two steps", () => {
    expect(climbStairs(2)).toBe(2);
  });

  it("has three ways to climb three steps", () => {
    expect(climbStairs(3)).toBe(3);
  });

  it.each([
    [4, 5],
    [5, 8],
    [6, 13],
    [10, 89],
    [15, 987],
    [20, 10_946],
    [25, 121_393],
    [30, 1_346_269]
  ])("climbs %i steps in %i ways", (steps, ways) => {
    expect(climbStairs(steps)).toBe(ways);
  });

  it("gives the same answers when asked again, in any order", () => {
    expect(climbStairs(10)).toBe(89);
    expect(climbStairs(5)).toBe(8);
    expect(climbStairs(10)).toBe(89);
  });

  it("matches the pattern for every size from 35 steps down to 1", () => {
    const expected = waysUpTo(SEQUENCE_CHECK_LIMIT);
    for (let steps = SEQUENCE_CHECK_LIMIT; steps >= 1; steps--) {
      expect(climbStairs(steps), `${steps} steps`).toBe(expected[steps]);
    }
  });

  it("climbs 45 steps in under a second (not exponential recursion)", () => {
    const { result: ways, elapsedMs } = measureMs(() => climbStairs(LARGEST_STAIRCASE));
    expect(elapsedMs).toBeLessThan(TIME_LIMIT_MS);
    expect(ways).toBe(WAYS_FOR_LARGEST_STAIRCASE);
  });
});
