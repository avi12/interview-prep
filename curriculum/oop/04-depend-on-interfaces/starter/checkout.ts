import type { Mailer, OrderLine, OrderRepository, PaymentGateway } from "./ports.ts";

export type CheckoutResult =
  | { status: "placed"; orderId: string }
  | { status: "declined"; reason: string };

export type CheckoutDependencies = {
  gateway: PaymentGateway;
  orders: OrderRepository;
  mailer: Mailer;
  newId: () => string;
};

export class Checkout {
  constructor(_dependencies: CheckoutDependencies) {}

  async placeOrder(_input: { customerEmail: string; lines: readonly OrderLine[]; paymentToken: string }): Promise<CheckoutResult> {
    throw new Error("not implemented");
  }
}
