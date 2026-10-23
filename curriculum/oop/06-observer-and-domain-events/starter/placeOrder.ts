import type { EventBus } from "./eventBus.ts";
import type { OrderLine, OrderRepository } from "./ports.ts";

export type PlaceOrderDependencies = {
  orders: OrderRepository;
  bus: EventBus;
  newId: () => string;
};

export function createPlaceOrder(_dependencies: PlaceOrderDependencies) {
  return async (_input: {
    customerEmail: string;
    lines: readonly OrderLine[];
  }): Promise<{ orderId: string }> => {
    throw new Error("not implemented");
  };
}
