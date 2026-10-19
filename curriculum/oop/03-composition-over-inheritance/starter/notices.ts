import type { Money } from "#kit/bookstore/money.ts";
import type { Notice } from "./parts.ts";

export const orderPlacedNotice = ({ orderId, total }: { orderId: string; total: Money }): Notice => ({
  orderId,
  text: `Order ${orderId} placed, total ${total}`
});

export const orderShippedNotice = ({ orderId }: { orderId: string }): Notice => ({
  orderId,
  text: `Order ${orderId} shipped`
});
