import type { Listener, OrderPlaced } from "./events.ts";
import type { Inventory, LoyaltyLedger, Mailer } from "./ports.ts";

const CENTS_PER_POINT = 100;

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
  readonly #inventory: Inventory;

  constructor({ inventory }: { inventory: Inventory }) {
    this.#inventory = inventory;
  }

  async handle({ lines }: OrderPlaced) {
    for (const { isbn, quantity } of lines) await this.#inventory.recordSale({ isbn, quantity });
  }
}

export class LoyaltyListener implements Listener<OrderPlaced> {
  readonly #ledger: LoyaltyLedger;

  constructor({ ledger }: { ledger: LoyaltyLedger }) {
    this.#ledger = ledger;
  }

  async handle({ customerEmail, total }: OrderPlaced) {
    const points = Math.floor(total.cents / CENTS_PER_POINT);
    if (points === 0) return;
    await this.#ledger.award({ email: customerEmail, points });
  }
}
