import type { Money } from "./money.ts";
import type { DiscountRule, OrderLine } from "./types.ts";

export function subtotalOf(_lines: readonly OrderLine[]): Money {
  throw new Error("not implemented");
}

export function percentOff(_input: { percent: number }): DiscountRule {
  throw new Error("not implemented");
}

export function bulkDiscount(_input: {
  minimumQuantity: number;
  percent: number;
}): DiscountRule {
  throw new Error("not implemented");
}

export function totalDiscount(_input: {
  rules: readonly DiscountRule[];
  lines: readonly OrderLine[];
}): Money {
  throw new Error("not implemented");
}
