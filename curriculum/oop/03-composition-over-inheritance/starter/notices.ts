import type { Notice } from "./parts.ts";
import type { Money } from "#kit/bookstore/money.ts";

export function orderPlacedNotice({ orderId, total }: {
  orderId: string;
  total: Money;
}): Notice {
  return {
    orderId,
    text: `Order ${orderId} placed, total ${total}`
  };
}

export function orderShippedNotice({ orderId }: { orderId: string }): Notice {
  return {
    orderId,
    text: `Order ${orderId} shipped`
  };
}
