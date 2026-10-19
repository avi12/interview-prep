const NUMERALS = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"]
] as const;
const MIN_VALUE = 1;
const MAX_VALUE = 3999;

export function toRoman(value: number) {
  if (!Number.isInteger(value) || value < MIN_VALUE || value > MAX_VALUE) throw new RangeError(`value must be a whole number from ${MIN_VALUE} to ${MAX_VALUE}`);
  let remaining = value;
  let result = "";
  for (const [size, numeral] of NUMERALS) {
    result += numeral.repeat(Math.floor(remaining / size));
    remaining %= size;
  }
  return result;
}
