import type { Listener, OrderPlaced } from "./events.ts";
import type { Inventory, LoyaltyLedger, Mailer } from "./ports.ts";

export class ConfirmationEmailListener implements Listener<OrderPlaced> {
  readonly #mailer: Mailer;

  constructor({ mailer }: { mailer: Mailer }) {
    this.#mailer = mailer;
  }

  async handle({ orderId, customerEmail, total }: OrderPlaced) {
    await this.#mailer.send({
      to: customerEmail,
      subject: `Order ${orderId} confirmed`,
      body: `Thanks for your order. Total ${total}.`
    });
  }
}

export class StockListener implements Listener<OrderPlaced> {
  constructor(_options: { inventory: Inventory }) {}

  async handle(_event: OrderPlaced): Promise<void> {
    throw new Error("not implemented");
  }
}

export class LoyaltyListener implements Listener<OrderPlaced> {
  constructor(_options: { ledger: LoyaltyLedger }) {}

  async handle(_event: OrderPlaced): Promise<void> {
    throw new Error("not implemented");
  }
}
