import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Module = { productExceptSelf: (numbers: number[]) => number[] };

const { productExceptSelf } = await loadImpl<Module>({ testUrl: import.meta.url, file: "productExceptSelf.ts" });

const LARGE_SIZE = 100_000;
const TIME_LIMIT_MS = 1000;

const withoutNegativeZero = (values: number[]) => values.map(value => value + 0);

const onesWith = ({ size, specials }: { size: number; specials: Record<number, number> }) => {
  const numbers = Array.from({ length: size }, () => 1);
  for (const [index, value] of Object.entries(specials)) numbers[Number(index)] = value;
  return numbers;
};

describe("productExceptSelf", () => {
  it("multiplies all the other numbers", () => {
    expect(withoutNegativeZero(productExceptSelf([1, 2, 3, 4]))).toEqual([24, 12, 8, 6]);
  });

  it("works for two numbers", () => {
    expect(withoutNegativeZero(productExceptSelf([2, 3]))).toEqual([3, 2]);
  });

  it("works when every number is 1", () => {
    expect(withoutNegativeZero(productExceptSelf([1, 1, 1]))).toEqual([1, 1, 1]);
  });

  it("handles negative numbers", () => {
    expect(withoutNegativeZero(productExceptSelf([-1, -2, -3]))).toEqual([6, 3, 2]);
  });

  it("handles one zero: only its own slot is not zero", () => {
    expect(withoutNegativeZero(productExceptSelf([0, 4, 2]))).toEqual([8, 0, 0]);
    expect(withoutNegativeZero(productExceptSelf([-1, 1, 0, -3, 3]))).toEqual([0, 0, 9, 0, 0]);
  });

  it("handles two zeros: everything is zero", () => {
    expect(withoutNegativeZero(productExceptSelf([0, 0, 3]))).toEqual([0, 0, 0]);
  });

  it("does not change the input", () => {
    const numbers = [1, 2, 3, 4];
    productExceptSelf(numbers);
    expect(numbers).toEqual([1, 2, 3, 4]);
  });

  it("stays fast on 100,000 numbers (O(n), not O(n squared))", () => {
    const numbers = onesWith({ size: LARGE_SIZE, specials: { 100: 3, 80_000: -5 } });
    const startedAt = performance.now();
    const products = productExceptSelf(numbers);
    expect(performance.now() - startedAt).toBeLessThan(TIME_LIMIT_MS);
    expect(products[0]).toBe(-15);
    expect(products[100]).toBe(-5);
    expect(products[80_000]).toBe(3);
    expect(products[LARGE_SIZE - 1]).toBe(-15);
  });

  it("stays fast and correct with a zero in the middle of 100,000 numbers", () => {
    const numbers = onesWith({ size: LARGE_SIZE, specials: { 50_000: 0, 60_000: 7 } });
    const startedAt = performance.now();
    const products = withoutNegativeZero(productExceptSelf(numbers));
    expect(performance.now() - startedAt).toBeLessThan(TIME_LIMIT_MS);
    expect(products[50_000]).toBe(7);
    expect(products[60_000]).toBe(0);
    expect(products[0]).toBe(0);
    expect(products.filter(value => value !== 0)).toEqual([7]);
  });
});
