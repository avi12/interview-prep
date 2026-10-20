import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Module = { findLargest: (numbers: number[]) => number | null };

const { findLargest } = await loadImpl<Module>({ testUrl: import.meta.url, file: "findLargest.ts" });

describe("findLargest", () => {
  it("finds the largest in a simple list", () => {
    expect(findLargest([3, 9, 4])).toBe(9);
  });

  it("works when the largest is first or last", () => {
    expect(findLargest([9, 3, 4])).toBe(9);
    expect(findLargest([3, 4, 9])).toBe(9);
  });

  it("works with a single number", () => {
    expect(findLargest([5])).toBe(5);
  });

  it("works when every number is negative", () => {
    expect(findLargest([-8, -2, -5])).toBe(-2);
  });

  it("returns null for an empty list", () => {
    expect(findLargest([])).toBeNull();
  });

  it("does not change the list it was given", () => {
    const numbers = Object.freeze([2, 7, 1]) as number[];
    expect(findLargest(numbers)).toBe(7);
    expect(numbers).toEqual([2, 7, 1]);
  });
});
