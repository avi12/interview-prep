import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { implPath, loadImpl } from "#kit/impl.ts";
import { createSeededPicker } from "#kit/random.ts";
import { measureMs } from "#kit/timing.ts";

type Module = { productExceptSelf: (numbers: number[]) => number[] };

const IMPL_FILE = "productExceptSelf.ts";
const LARGE_SIZE = 100_000;
const TIME_LIMIT_MS = 1000;
const COMMENTS_AND_TEXT = /\/\/.*|\/\*[\s\S]*?\*\/|"[^"\n]*"|'[^'\n]*'|`[^`]*`/g;
const DIVISION_SIGN = "/";
const RANDOM_ROUNDS = 300;
const RANDOM_LENGTHS = { min: 2, max: 9 };
const RANDOM_VALUES = [-3, -2, -1, 0, 0, 1, 2, 3];
const SEED = 238;

const { productExceptSelf } = await loadImpl<Module>({ testUrl: import.meta.url, file: IMPL_FILE });

const slowProductsExceptSelf = (numbers: number[]) =>
  numbers.map((_, index) => {
    let product = 1;
    for (const [otherIndex, value] of numbers.entries()) if (otherIndex !== index) product *= value;
    return product;
  });

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

  it("matches a slow, obvious version on many small inputs with zeros and negatives", () => {
    const pick = createSeededPicker(SEED);
    for (let round = 0; round < RANDOM_ROUNDS; round++) {
      const length = RANDOM_LENGTHS.min + pick(RANDOM_LENGTHS.max - RANDOM_LENGTHS.min + 1);
      const numbers = Array.from({ length }, () => RANDOM_VALUES[pick(RANDOM_VALUES.length)]);
      const copy = [...numbers];
      expect(withoutNegativeZero(productExceptSelf(numbers)), `input ${copy.join(", ")}`).toEqual(withoutNegativeZero(slowProductsExceptSelf(copy)));
    }
  });

  it("does not use division (the rule of this exercise)", () => {
    const source = readFileSync(implPath({ testUrl: import.meta.url, file: IMPL_FILE }), "utf8");
    const code = source.replace(COMMENTS_AND_TEXT, "");
    expect(code.includes(DIVISION_SIGN), "found a / in your code: build the answer from left and right products").toBe(false);
  });

  it("does not change the input", () => {
    const numbers = [1, 2, 3, 4];
    productExceptSelf(numbers);
    expect(numbers).toEqual([1, 2, 3, 4]);
  });

  it("stays fast on 100,000 numbers (O(n), not O(n squared))", () => {
    const numbers = onesWith({ size: LARGE_SIZE, specials: { 100: 3, 80_000: -5 } });
    const { result: products, elapsedMs } = measureMs(() => productExceptSelf(numbers));
    expect(elapsedMs).toBeLessThan(TIME_LIMIT_MS);
    expect(products[0]).toBe(-15);
    expect(products[100]).toBe(-5);
    expect(products[80_000]).toBe(3);
    expect(products[LARGE_SIZE - 1]).toBe(-15);
  });

  it("stays fast and correct with a zero in the middle of 100,000 numbers", () => {
    const numbers = onesWith({ size: LARGE_SIZE, specials: { 50_000: 0, 60_000: 7 } });
    const { result: rawProducts, elapsedMs } = measureMs(() => productExceptSelf(numbers));
    const products = withoutNegativeZero(rawProducts);
    expect(elapsedMs).toBeLessThan(TIME_LIMIT_MS);
    expect(products[50_000]).toBe(7);
    expect(products[60_000]).toBe(0);
    expect(products[0]).toBe(0);
    expect(products.filter(value => value !== 0)).toEqual([7]);
  });
});
