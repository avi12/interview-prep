import type { ChargeResult, Order, OrderRequest, PlaceOrderResult } from "./contracts.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BULK_MINIMUM_QUANTITY = 10;
const BULK_PERCENT = 10;
const WELCOME_COUPON = "WELCOME5";
const WELCOME_COUPON_CENTS = 500;
const PERCENT_DIVISOR = 100;
const FIRST_ORDER_NUMBER = 1;

export class OrderService {
  private readonly savedOrders = new Map<string, Order>();
  private readonly outbox: string[] = [];
  private nextOrderNumber = FIRST_ORDER_NUMBER;

  async placeOrder(request: OrderRequest): Promise<PlaceOrderResult> {
    const problems: string[] = [];
    if (!EMAIL_PATTERN.test(request.customerEmail)) problems.push("email is invalid");
    if (request.lines.length === 0) problems.push("order has no lines");
    if (request.lines.some(line => !Number.isInteger(line.quantity) || line.quantity <= 0)) {
      problems.push("quantity must be a whole number above zero");
    }
    if (request.lines.some(line => !Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0)) {
      problems.push("price must be a whole number of cents, zero or more");
    }
    if (problems.length > 0) return { status: "rejected", problems };

    let subtotalCents = 0;
    let totalQuantity = 0;
    for (const line of request.lines) {
      subtotalCents += line.unitPriceCents * line.quantity;
      totalQuantity += line.quantity;
    }
    let discountCents = 0;
    if (totalQuantity >= BULK_MINIMUM_QUANTITY) {
      discountCents += Math.round((subtotalCents * BULK_PERCENT) / PERCENT_DIVISOR);
    }
    if (request.couponCode === WELCOME_COUPON) discountCents += WELCOME_COUPON_CENTS;
    discountCents = Math.min(discountCents, subtotalCents);
    const totalCents = subtotalCents - discountCents;

    const charge = await this.callPaymentProvider({ email: request.customerEmail, amountCents: totalCents });
    if (!charge.ok) return { status: "declined", reason: charge.reason };

    const order: Order = {
      id: `order-${this.nextOrderNumber++}`,
      customerEmail: request.customerEmail,
      lines: request.lines,
      totalCents
    };
    this.savedOrders.set(order.id, order);
    this.outbox.push(`To: ${order.customerEmail} | Receipt for ${order.id}: ${order.totalCents} cents`);
    return { status: "paid", order };
  }

  private async callPaymentProvider(_input: { email: string; amountCents: number }): Promise<ChargeResult> {
    return { ok: true };
  }
}
