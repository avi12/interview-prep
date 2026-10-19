import type { Money } from "#kit/bookstore/money.ts";
import type { OrderLine } from "#kit/bookstore/orders.ts";

export type PricedLine = OrderLine;

export type PricingContext = {
  lines: readonly PricedLine[];
  subtotal: Money;
  shippingFee: Money;
};

export interface DiscountRule {
  readonly name: string;
  discountFor(context: PricingContext): Money;
}

export class PercentOff implements DiscountRule {
  readonly name = "percent off";

  constructor(_options: { percent: number }) {}

  discountFor(_context: PricingContext): Money {
    throw new Error("not implemented");
  }
}

export class BuyTwoGetOneFree implements DiscountRule {
  readonly name = "buy two get one free";

  discountFor(_context: PricingContext): Money {
    throw new Error("not implemented");
  }
}

export class FreeShippingFrom implements DiscountRule {
  readonly name = "free shipping";

  constructor(_options: { threshold: Money }) {}

  discountFor(_context: PricingContext): Money {
    throw new Error("not implemented");
  }
}
