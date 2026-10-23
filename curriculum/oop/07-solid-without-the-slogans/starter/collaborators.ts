import type { OrderValidator, PriceCalculator, PricingRule, ReceiptSender } from "./contracts.ts";

export function createOrderValidator(): OrderValidator {
  throw new Error("not implemented");
}

export function createBulkDiscountRule(_input: { minimumQuantity: number; percent: number }): PricingRule {
  throw new Error("not implemented");
}

export function createCouponRule(_input: { code: string; amountCents: number }): PricingRule {
  throw new Error("not implemented");
}

export function createPriceCalculator(_input: { rules: PricingRule[] }): PriceCalculator {
  throw new Error("not implemented");
}

export function createNoReceiptSender(): ReceiptSender {
  return {
    send: async () => {
      throw new Error("not supported");
    }
  };
}
