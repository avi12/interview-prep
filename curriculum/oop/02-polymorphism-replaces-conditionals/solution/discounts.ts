import { Money } from "#kit/bookstore/money.ts";
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

const COPIES_PER_FREE_ONE = 3;

export class PercentOff implements DiscountRule {
  readonly name: string;
  readonly #percent: number;

  constructor({ percent }: { percent: number }) {
    this.#percent = percent;
    this.name = `${percent}% off`;
  }

  discountFor({ subtotal }: PricingContext) {
    return subtotal.percentage(this.#percent);
  }
}

export class BuyTwoGetOneFree implements DiscountRule {
  readonly name = "Buy 2 get 1 free";

  discountFor({ lines, subtotal }: PricingContext) {
    let discount = Money.zero(subtotal.currency);
    for (const line of lines) {
      const freeCopies = Math.floor(line.quantity / COPIES_PER_FREE_ONE);
      discount = discount.add(line.unitPrice.multiply(freeCopies));
    }
    return discount;
  }
}

export class FreeShippingFrom implements DiscountRule {
  readonly name = "Free shipping";
  readonly #threshold: Money;

  constructor({ threshold }: { threshold: Money }) {
    this.#threshold = threshold;
  }

  discountFor({ subtotal, shippingFee }: PricingContext) {
    if (subtotal.isAtLeast(this.#threshold)) {
      return shippingFee;
    }

    return Money.zero(shippingFee.currency);
  }
}
