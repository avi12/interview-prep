import { DomainError } from "#kit/bookstore/domainError.ts";
import { Money } from "#kit/bookstore/money.ts";
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

const totalOf = (lines: readonly OrderLine[]) => {
  let total = Money.zero(lines[0].unitPrice.currency);
  for (const line of lines) total = total.add(line.unitPrice.multiply(line.quantity));
  return total;
};

export class Checkout {
  readonly #gateway: PaymentGateway;
  readonly #orders: OrderRepository;
  readonly #mailer: Mailer;
  readonly #newId: () => string;

  constructor({ gateway, orders, mailer, newId }: CheckoutDependencies) {
    this.#gateway = gateway;
    this.#orders = orders;
    this.#mailer = mailer;
    this.#newId = newId;
  }

  async placeOrder({ customerEmail, lines, paymentToken }: { customerEmail: string; lines: readonly OrderLine[]; paymentToken: string }): Promise<CheckoutResult> {
    if (lines.length === 0) throw new DomainError("cannot place an order with no lines");
    const total = totalOf(lines);
    const charge = await this.#gateway.charge({ amount: total, paymentToken });
    if (charge.status === "declined") return { status: "declined", reason: charge.reason };
    const order = { id: this.#newId(), customerEmail, lines: [...lines], total, transactionId: charge.transactionId };
    await this.#orders.save(order);
    await this.#mailer.send({
      to: customerEmail,
      subject: `Order ${order.id} confirmed`,
      body: `Thanks for your order. We charged ${total}.`
    });
    return { status: "placed", orderId: order.id };
  }
}
