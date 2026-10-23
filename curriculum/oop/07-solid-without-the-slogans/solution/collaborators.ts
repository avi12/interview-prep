import type {
  OrderRequest,
  OrderValidator,
  PriceCalculator,
  PricingRule,
  ReceiptSender
} from "./contracts.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERCENT_DIVISOR = 100;
const EMAIL_PROBLEM = "email is invalid";
const NO_LINES_PROBLEM = "order has no lines";
const QUANTITY_PROBLEM = "quantity must be a whole number above zero";
const PRICE_PROBLEM = "price must be a whole number of cents, zero or more";

function subtotalCentsOf(request: OrderRequest) {
  let subtotalCents = 0;
  for (const line of request.lines) {
    subtotalCents += line.unitPriceCents * line.quantity;
  }
  return subtotalCents;
}

function totalQuantityOf(request: OrderRequest) {
  let totalQuantity = 0;
  for (const line of request.lines) {
    totalQuantity += line.quantity;
  }
  return totalQuantity;
}

export function createOrderValidator(): OrderValidator {
  return {
    validate(request) {
      const problems: string[] = [];
      if (!EMAIL_PATTERN.test(request.customerEmail)) {
        problems.push(EMAIL_PROBLEM);
      }

      if (request.lines.length === 0) {
        problems.push(NO_LINES_PROBLEM);
      }

      if (request.lines.some(line => !Number.isInteger(line.quantity) || line.quantity <= 0)) {
        problems.push(QUANTITY_PROBLEM);
      }

      if (request.lines.some(line => !Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0)) {
        problems.push(PRICE_PROBLEM);
      }

      return problems;
    }
  };
}

export function createBulkDiscountRule({ minimumQuantity, percent }: {
  minimumQuantity: number;
  percent: number;
}): PricingRule {
  return {
    name: `bulk ${percent} percent from ${minimumQuantity} books`,
    discountCents(request) {
      if (totalQuantityOf(request) < minimumQuantity) {
        return 0;
      }

      return Math.round((subtotalCentsOf(request) * percent) / PERCENT_DIVISOR);
    }
  };
}

export function createCouponRule({ code, amountCents }: {
  code: string;
  amountCents: number;
}): PricingRule {
  return {
    name: `coupon ${code}`,
    discountCents: request => (request.couponCode === code ? amountCents : 0)
  };
}

export function createPriceCalculator({ rules }: { rules: PricingRule[] }): PriceCalculator {
  return {
    priceOf(request) {
      const subtotalCents = subtotalCentsOf(request);
      let discountCents = 0;
      for (const rule of rules) {
        discountCents += rule.discountCents(request);
      }
      discountCents = Math.min(discountCents, subtotalCents);
      return {
        subtotalCents,
        discountCents,
        totalCents: subtotalCents - discountCents
      };
    }
  };
}

export function createNoReceiptSender(): ReceiptSender {
  return {
    async send() {}
  };
}
