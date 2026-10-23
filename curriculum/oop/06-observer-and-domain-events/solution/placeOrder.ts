import { DomainError } from "#kit/bookstore/domainError.ts";
import type { EventBus } from "./eventBus.ts";
import { EventType } from "./events.ts";
import type { OrderPlaced } from "./events.ts";
import { Money } from "#kit/bookstore/money.ts";
import type { OrderLine, OrderRepository } from "./ports.ts";

export type PlaceOrderDependencies = {
  orders: OrderRepository;
  bus: EventBus;
  newId: () => string;
};

const totalOf = (lines: readonly OrderLine[]) => {
  let total = Money.zero(lines[0].unitPrice.currency);
  for (const line of lines) total = total.add(line.unitPrice.multiply(line.quantity));
  return total;
};

export const createPlaceOrder =
  ({ orders, bus, newId }: PlaceOrderDependencies) =>
  async ({ customerEmail, lines }: { customerEmail: string; lines: readonly OrderLine[] }) => {
    if (lines.length === 0) throw new DomainError("cannot place an order with no lines");
    const order = { id: newId(), customerEmail, lines: [...lines], total: totalOf(lines) };
    await orders.save(order);
    const event: OrderPlaced = {
      type: EventType.orderPlaced,
      orderId: order.id,
      customerEmail,
      lines: order.lines,
      total: order.total
    };
    await bus.publish(event);
    return { orderId: order.id };
  };
