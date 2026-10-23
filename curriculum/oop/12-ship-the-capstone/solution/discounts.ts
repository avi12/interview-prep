import { Money } from "./money.ts";
import type { DiscountRule, OrderLine } from "./types.ts";

const MIN_PERCENT = 0;
const MAX_PERCENT = 100;

function requireValidPercent(percent: number) {
  if (Number.isFinite(percent) && percent >= MIN_PERCENT && percent <= MAX_PERCENT) {
    return;
  }

  throw new RangeError(`percent must be from ${MIN_PERCENT} to ${MAX_PERCENT}, got ${percent}`);
}

function quantityOf(lines: readonly OrderLine[]) {
  let quantity = 0;
  for (const line of lines) {
    quantity += line.quantity;
  }
  return quantity;
}

export function subtotalOf(lines: readonly OrderLine[]) {
  let subtotal = Money.zero(lines[0]?.unitPrice.currency);
  for (const line of lines) {
    subtotal = subtotal.add(line.unitPrice.multiply(line.quantity));
  }
  return subtotal;
}

export function percentOff({ percent }: { percent: number }): DiscountRule {
  requireValidPercent(percent);
  return {
    name: `${percent} percent off`,
    discountFor: lines => subtotalOf(lines).percentOf(percent)
  };
}

export function bulkDiscount({ minimumQuantity, percent }: {
  minimumQuantity: number;
  percent: number;
}): DiscountRule {
  requireValidPercent(percent);
  return {
    name: `${percent} percent off from ${minimumQuantity} books`,
    discountFor(lines) {
      const subtotal = subtotalOf(lines);
      return quantityOf(lines) >= minimumQuantity ? subtotal.percentOf(percent) : Money.zero(subtotal.currency);
    }
  };
}

export function totalDiscount({ rules, lines }: {
  rules: readonly DiscountRule[];
  lines: readonly OrderLine[];
}) {
  const subtotal = subtotalOf(lines);
  let discount = Money.zero(subtotal.currency);
  for (const rule of rules) {
    discount = discount.add(rule.discountFor(lines));
  }
  return discount.isGreaterThan(subtotal) ? subtotal : discount;
}
