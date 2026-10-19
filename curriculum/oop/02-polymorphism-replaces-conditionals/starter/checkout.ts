import type { DiscountRule, PricedLine } from "./discounts.ts";
import type { Money } from "#kit/bookstore/money.ts";

export type AppliedDiscount = { rule: string; amount: Money };

export type Quote = {
  subtotal: Money;
  discounts: readonly AppliedDiscount[];
  shippingFee: Money;
  total: Money;
};

export class Checkout {
  constructor(_options: { rules: readonly DiscountRule[] }) {}

  quote(_input: { lines: readonly PricedLine[]; shippingFee: Money }): Quote {
    throw new Error("not implemented");
  }
}
