import { loadImpl } from "#kit/impl.ts";
import { describe, expect, it } from "vitest";

type Module = { toRoman: (value: number) => string };

const { toRoman } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "roman.ts"
});

const MIN_VALUE = 1;
const MAX_VALUE = 3999;
const SHAPE = /^(?=.)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const VALUES: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000
};
const MAX_REPORTED = 5;

function toNumber(numeral: string) {
  let total = 0;
  for (const [index, letter] of Array.from(numeral).entries()) {
    const next = VALUES[numeral[index + 1]] ?? 0;
    total += VALUES[letter] < next ? -VALUES[letter] : VALUES[letter];
  }
  return total;
}

describe("stage 1 - repeat the one", () => {
  it.each([
    [1, "I"],
    [2, "II"],
    [3, "III"]
  ])("writes %i as %s", (value, expected) => {
    expect(toRoman(value)).toBe(expected);
  });
});

describe("stage 2 - five and what follows", () => {
  it.each([
    [5, "V"],
    [6, "VI"],
    [8, "VIII"]
  ])("writes %i as %s", (value, expected) => {
    expect(toRoman(value)).toBe(expected);
  });
});

describe("stage 3 - four and nine subtract", () => {
  it.each([
    [4, "IV"],
    [9, "IX"]
  ])("writes %i as %s", (value, expected) => {
    expect(toRoman(value)).toBe(expected);
  });
});

describe("stage 4 - tens", () => {
  it.each([
    [10, "X"],
    [14, "XIV"],
    [19, "XIX"],
    [40, "XL"],
    [50, "L"],
    [90, "XC"]
  ])("writes %i as %s", (value, expected) => {
    expect(toRoman(value)).toBe(expected);
  });
});

describe("stage 5 - hundreds and thousands", () => {
  it.each([
    [100, "C"],
    [400, "CD"],
    [500, "D"],
    [900, "CM"],
    [1000, "M"],
    [1994, "MCMXCIV"],
    [2024, "MMXXIV"],
    [3999, "MMMCMXCIX"]
  ])("writes %i as %s", (value, expected) => {
    expect(toRoman(value)).toBe(expected);
  });
});

describe("stage 6 - the rule works for every number, not only the examples", () => {
  it("gives a correctly shaped numeral for every number from 1 to 3999", () => {
    const misshapen: number[] = [];
    for (let value = MIN_VALUE; value <= MAX_VALUE; value++) {
      if (!SHAPE.test(toRoman(value))) {
        misshapen.push(value);
      }
    }

    expect(misshapen.slice(0, MAX_REPORTED)).toEqual([]);
  });

  it("reads back as the same number for every number from 1 to 3999", () => {
    const wrong: number[] = [];
    for (let value = MIN_VALUE; value <= MAX_VALUE; value++) {
      if (toNumber(toRoman(value)) !== value) {
        wrong.push(value);
      }
    }

    expect(wrong.slice(0, MAX_REPORTED)).toEqual([]);
  });
});

describe("stage 7 - numbers that have no numeral", () => {
  it.each([0, -5, 4000, 1.5])("rejects %s with a RangeError", value => {
    expect(() => toRoman(value)).toThrow(RangeError);
  });
});
