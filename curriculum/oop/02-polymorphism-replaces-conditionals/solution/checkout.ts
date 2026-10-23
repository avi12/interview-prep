import type { DiscountRule, PricedLine } from "./discounts.ts";
import { Money } from "#kit/bookstore/money.ts";

export type AppliedDiscount = {
  rule: string;
  amount: Money;
};

export type Quote = {
  subtotal: Money;
  discounts: readonly AppliedDiscount[];
  shippingFee: Money;
  total: Money;
};

function sumOf({ amounts, currency }: {
  amounts: readonly Money[];
  currency: string;
}) {
  let sum = Money.zero(currency);
  for (const amount of amounts) {
    sum = sum.add(amount);
  }
  return sum;
}

export class Checkout {
  readonly #rules: readonly DiscountRule[];

  constructor({ rules }: { rules: readonly DiscountRule[] }) {
    this.#rules = [...rules];
  }

  quote({ lines, shippingFee }: {
    lines: readonly PricedLine[];
    shippingFee: Money;
  }): Quote {
    const { currency } = shippingFee;
    const subtotal = sumOf({
      amounts: lines.map(line => line.unitPrice.multiply(line.quantity)),
      currency
    });
    const context = {
      lines,
      subtotal,
      shippingFee
    };
    const discounts: AppliedDiscount[] = [];
    for (const rule of this.#rules) {
      const amount = rule.discountFor(context);
      if (amount.cents === 0) {
        continue;
      }

      discounts.push({
        rule: rule.name,
        amount
      });
    }
    const gross = subtotal.add(shippingFee);
    const allDiscounts = sumOf({
      amounts: discounts.map(discount => discount.amount),
      currency
    });
    const applied = allDiscounts.isGreaterThan(gross) ? gross : allDiscounts;
    return {
      subtotal,
      discounts,
      shippingFee,
      total: gross.subtract(applied)
    };
  }
}
