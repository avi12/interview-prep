import type { EventBus } from "./eventBus.ts";
import type { OrderLine, OrderRepository } from "./ports.ts";

export type PlaceOrderDependencies = {
  orders: OrderRepository;
  bus: EventBus;
  newId: () => string;
};

export const createPlaceOrder =
  (_dependencies: PlaceOrderDependencies) =>
  async (_input: { customerEmail: string; lines: readonly OrderLine[] }): Promise<{ orderId: string }> => {
    throw new Error("not implemented");
  };
