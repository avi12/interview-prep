import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { createGate, nextTick } from "#kit/async.ts";
import type { CheckoutError as CheckoutErrorClass } from "../starter/errors.ts";
import type { Money as MoneyClass } from "../starter/money.ts";
import type {
  Checkout,
  CheckoutEvent,
  CheckoutOptions,
  DiscountRule,
  OrderLine,
  PaymentGateway
} from "../starter/types.ts";

type PublicApi = {
  createCheckout: (options: CheckoutOptions) => Checkout;
  percentOff: (input: { percent: number }) => DiscountRule;
  bulkDiscount: (input: { minimumQuantity: number; percent: number }) => DiscountRule;
  Money: typeof MoneyClass;
  CheckoutError: typeof CheckoutErrorClass;
};

const api = await loadImpl<PublicApi>({ testUrl: import.meta.url, file: "index.ts" });
const { createCheckout, percentOff, bulkDiscount, Money, CheckoutError } = api;

const PUBLIC_NAMES = ["CheckoutError", "Money", "bulkDiscount", "createCheckout", "percentOff"];
const BOOK_CENTS = 1000;

const bookLines = (quantity = 1): OrderLine[] => [{ title: "Clean Code", unitPrice: Money.usd(BOOK_CENTS), quantity }];

const setup = (overrides: Partial<CheckoutOptions> = {}) => {
  const charges: { orderId: string; cents: number }[] = [];
  const refunds: { orderId: string; receiptId: string; cents: number }[] = [];
  const reported: unknown[] = [];
  const behavior = { declineReason: undefined as string | undefined, chargeGate: undefined as Promise<void> | undefined, failRefund: false };
  let receiptCount = 0;
  let orderCount = 0;
  const gateway: PaymentGateway = {
    charge: async ({ orderId, amount }) => {
      charges.push({ orderId, cents: amount.cents });
      await behavior.chargeGate;
      if (behavior.declineReason) return { ok: false, reason: behavior.declineReason };
      return { ok: true, receiptId: `receipt-${++receiptCount}` };
    },
    refund: async ({ orderId, receiptId, amount }) => {
      if (behavior.failRefund) throw new Error("refund service down");
      refunds.push({ orderId, receiptId, cents: amount.cents });
    }
  };
  const checkout = createCheckout({
    gateway,
    newId: () => `order-${++orderCount}`,
    reportError: error => void reported.push(error),
    ...overrides
  });
  const events: CheckoutEvent[] = [];
  checkout.on(event => void events.push(event));
  return { checkout, charges, refunds, reported, events, behavior };
};

const placeAndPay = async (context: ReturnType<typeof setup>, quantity = 1) => {
  const order = context.checkout.placeOrder({ lines: bookLines(quantity) });
  await context.checkout.pay(order.id);
  return order.id;
};

const thrownBy = (action: () => unknown) => {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to throw");
};

describe("the public API", () => {
  it("exports exactly the documented names and nothing internal", () => {
    expect(Object.keys(api).sort()).toEqual(PUBLIC_NAMES);
  });

  it("the Money it exports works as a value object", () => {
    expect(Money.usd(1250).toString()).toBe("12.50 USD");
    expect(Money.usd(100).equals(Money.usd(100))).toBe(true);
    expect(() => Money.usd(-1)).toThrow(RangeError);
  });
});

describe("placing an order", () => {
  it("prices the order and starts it as placed", () => {
    const { checkout } = setup();

    const order = checkout.placeOrder({ lines: bookLines(2) });

    expect(order).toMatchObject({ id: "order-1", status: "placed" });
    expect(order.subtotal.cents).toBe(2000);
    expect(order.discount.cents).toBe(0);
    expect(order.total.cents).toBe(2000);
  });

  it("applies the discount rules it was given", () => {
    const { checkout } = setup({ rules: [bulkDiscount({ minimumQuantity: 3, percent: 10 }), percentOff({ percent: 5 })] });

    const small = checkout.placeOrder({ lines: bookLines(2) });
    const big = checkout.placeOrder({ lines: bookLines(3) });

    expect(small.discount.cents).toBe(100);
    expect(big.discount.cents).toBe(450);
    expect(big.total.cents).toBe(2550);
  });

  it("never lets the discount push the total below zero", () => {
    const hugeRule: DiscountRule = { name: "huge", discountFor: () => Money.usd(999_999) };
    const { checkout } = setup({ rules: [hugeRule] });

    const order = checkout.placeOrder({ lines: bookLines() });

    expect(order.discount.cents).toBe(BOOK_CENTS);
    expect(order.total.cents).toBe(0);
  });

  it("refuses an empty order", () => {
    const { checkout } = setup();

    const error = thrownBy(() => checkout.placeOrder({ lines: [] }));

    expect(error).toBeInstanceOf(CheckoutError);
    expect(error).toMatchObject({ code: "empty-order" });
  });

  it.each([0, -1, 1.5])("refuses a line with quantity %s", quantity => {
    const { checkout } = setup();

    expect(thrownBy(() => checkout.placeOrder({ lines: bookLines(quantity) }))).toMatchObject({ code: "invalid-line" });
  });

  it("hands out copies, so changing a returned order changes nothing stored", () => {
    const { checkout } = setup();
    const order = checkout.placeOrder({ lines: bookLines(2) });
    order.lines[0].quantity = 99;
    order.status = "shipped";

    const stored = checkout.getOrder(order.id);

    expect(stored.lines[0].quantity).toBe(2);
    expect(stored.status).toBe("placed");
  });

  it("an unknown order is reported with a coded error", () => {
    expect(thrownBy(() => setup().checkout.getOrder("nope"))).toMatchObject({ code: "unknown-order" });
  });
});

describe("paying", () => {
  it("charges the order total once and marks the order paid", async () => {
    const { checkout, charges } = setup();
    const order = checkout.placeOrder({ lines: bookLines(2) });

    const result = await checkout.pay(order.id);

    expect(result.outcome).toBe("paid");
    expect(result.order.status).toBe("paid");
    expect(charges).toEqual([{ orderId: order.id, cents: 2000 }]);
    expect(checkout.getOrder(order.id).status).toBe("paid");
  });

  it("a declined card leaves the order placed, reports why, and allows another try", async () => {
    const { checkout, behavior, events } = setup();
    const order = checkout.placeOrder({ lines: bookLines() });
    behavior.declineReason = "card declined";

    const declined = await checkout.pay(order.id);

    expect(declined).toMatchObject({ outcome: "declined", reason: "card declined" });
    expect(checkout.getOrder(order.id).status).toBe("placed");
    expect(events.map(event => event.type)).toEqual(["OrderPlaced", "PaymentDeclined"]);

    behavior.declineReason = undefined;
    expect((await checkout.pay(order.id)).outcome).toBe("paid");
  });

  it("paying twice is refused and charges once", async () => {
    const context = setup();
    const orderId = await placeAndPay(context);

    await expect(context.checkout.pay(orderId)).rejects.toMatchObject({ code: "invalid-transition" });
    expect(context.charges).toHaveLength(1);
  });

  it("two simultaneous payments charge only once", async () => {
    const context = setup();
    const gate = createGate();
    context.behavior.chargeGate = gate.promise;
    const order = context.checkout.placeOrder({ lines: bookLines() });

    const first = context.checkout.pay(order.id);
    const second = context.checkout.pay(order.id);

    await expect(second).rejects.toMatchObject({ code: "invalid-transition" });
    gate.release();
    expect((await first).outcome).toBe("paid");
    expect(context.charges).toHaveLength(1);
  });

  it("a gateway that throws leaves the order placed and does not lock it", async () => {
    const context = setup();
    const order = context.checkout.placeOrder({ lines: bookLines() });
    context.behavior.chargeGate = Promise.reject(new Error("network down"));
    context.behavior.chargeGate.catch(() => {});

    await expect(context.checkout.pay(order.id)).rejects.toThrow("network down");
    expect(context.checkout.getOrder(order.id).status).toBe("placed");

    context.behavior.chargeGate = undefined;
    expect((await context.checkout.pay(order.id)).outcome).toBe("paid");
  });

  it("paying an unknown order is refused", async () => {
    await expect(setup().checkout.pay("nope")).rejects.toMatchObject({ code: "unknown-order" });
  });
});

describe("shipping and cancelling", () => {
  it("ships a paid order", async () => {
    const context = setup();
    const orderId = await placeAndPay(context);

    const shipped = await context.checkout.ship(orderId);

    expect(shipped.status).toBe("shipped");
  });

  it("cannot ship an order that was not paid", async () => {
    const { checkout } = setup();
    const order = checkout.placeOrder({ lines: bookLines() });

    await expect(checkout.ship(order.id)).rejects.toMatchObject({ code: "invalid-transition" });
    expect(checkout.getOrder(order.id).status).toBe("placed");
  });

  it("cancelling an unpaid order refunds nothing", async () => {
    const { checkout, refunds, events } = setup();
    const order = checkout.placeOrder({ lines: bookLines() });

    const cancelled = await checkout.cancel(order.id);

    expect(cancelled.status).toBe("cancelled");
    expect(refunds).toEqual([]);
    expect(events.at(-1)).toEqual({ type: "OrderCancelled", orderId: order.id, wasRefunded: false });
  });

  it("cancelling a paid order refunds the receipt and the total", async () => {
    const context = setup();
    const orderId = await placeAndPay(context, 3);

    await context.checkout.cancel(orderId);

    expect(context.refunds).toEqual([{ orderId, receiptId: "receipt-1", cents: 3000 }]);
    expect(context.events.at(-1)).toEqual({ type: "OrderCancelled", orderId, wasRefunded: true });
  });

  it("a shipped order cannot be cancelled and nothing is refunded", async () => {
    const context = setup();
    const orderId = await placeAndPay(context);
    await context.checkout.ship(orderId);

    await expect(context.checkout.cancel(orderId)).rejects.toMatchObject({ code: "invalid-transition" });
    expect(context.refunds).toEqual([]);
  });

  it("a cancelled order is final: it cannot be paid, shipped or cancelled again", async () => {
    const { checkout } = setup();
    const order = checkout.placeOrder({ lines: bookLines() });
    await checkout.cancel(order.id);

    await expect(checkout.pay(order.id)).rejects.toMatchObject({ code: "invalid-transition" });
    await expect(checkout.ship(order.id)).rejects.toMatchObject({ code: "invalid-transition" });
    await expect(checkout.cancel(order.id)).rejects.toMatchObject({ code: "invalid-transition" });
  });

  it("if the refund fails the order stays paid, and cancelling can be retried", async () => {
    const context = setup();
    const orderId = await placeAndPay(context);
    context.behavior.failRefund = true;

    await expect(context.checkout.cancel(orderId)).rejects.toThrow("refund service down");
    expect(context.checkout.getOrder(orderId).status).toBe("paid");

    context.behavior.failRefund = false;
    expect((await context.checkout.cancel(orderId)).status).toBe("cancelled");
  });

  it("cancelling while a payment is in progress is refused", async () => {
    const context = setup();
    const gate = createGate();
    context.behavior.chargeGate = gate.promise;
    const order = context.checkout.placeOrder({ lines: bookLines() });
    const paying = context.checkout.pay(order.id);

    await expect(context.checkout.cancel(order.id)).rejects.toMatchObject({ code: "invalid-transition" });
    gate.release();
    await paying;
    expect(context.checkout.getOrder(order.id).status).toBe("paid");
  });
});

describe("domain events", () => {
  it("announces each step in order, carrying the facts a listener needs", async () => {
    const context = setup();
    const order = context.checkout.placeOrder({ lines: bookLines(2) });
    await context.checkout.pay(order.id);
    await context.checkout.ship(order.id);

    expect(context.events).toEqual([
      { type: "OrderPlaced", orderId: order.id, total: Money.usd(2000) },
      { type: "OrderPaid", orderId: order.id, receiptId: "receipt-1" },
      { type: "OrderShipped", orderId: order.id }
    ]);
  });

  it("announces nothing when an action is refused", async () => {
    const context = setup();
    const order = context.checkout.placeOrder({ lines: bookLines() });
    context.events.length = 0;

    await context.checkout.ship(order.id).catch(() => undefined);

    expect(context.events).toEqual([]);
  });

  it("stops delivering to a listener that unsubscribed", () => {
    const { checkout } = setup();
    const seen: string[] = [];
    const unsubscribe = checkout.on(event => void seen.push(event.type));
    checkout.placeOrder({ lines: bookLines() });

    unsubscribe();
    checkout.placeOrder({ lines: bookLines() });

    expect(seen).toEqual(["OrderPlaced"]);
  });

  it("a listener that throws is reported and does not break checkout or other listeners", () => {
    const context = setup();
    const boom = new Error("listener bug");
    context.checkout.on(() => {
      throw boom;
    });
    const seen: string[] = [];
    context.checkout.on(event => void seen.push(event.type));

    const order = context.checkout.placeOrder({ lines: bookLines() });

    expect(order.status).toBe("placed");
    expect(seen).toEqual(["OrderPlaced"]);
    expect(context.reported).toEqual([boom]);
  });

  it("a listener whose promise rejects is reported too", async () => {
    const context = setup();
    const boom = new Error("async listener bug");
    context.checkout.on(async () => {
      throw boom;
    });

    context.checkout.placeOrder({ lines: bookLines() });
    await nextTick();

    expect(context.reported).toEqual([boom]);
  });

  it("works without a reportError option", () => {
    const checkout = createCheckout({
      gateway: { charge: async () => ({ ok: true, receiptId: "r" }), refund: async () => {} },
      newId: () => "order-1"
    });
    checkout.on(() => {
      throw new Error("ignored");
    });

    expect(() => checkout.placeOrder({ lines: bookLines() })).not.toThrow();
  });
});

describe("extension: new variants plug in without editing your code", () => {
  const bookClubRule: DiscountRule = { name: "book club", discountFor: () => Money.usd(250) };

  it("a discount rule written in the test is applied next to the built-in ones", () => {
    const { checkout } = setup({ rules: [percentOff({ percent: 10 }), bookClubRule] });

    const order = checkout.placeOrder({ lines: bookLines(2) });

    expect(order.discount.cents).toBe(450);
    expect(order.total.cents).toBe(1550);
  });

  it("a different payment gateway can be injected", async () => {
    const calls: string[] = [];
    const bankTransferGateway: PaymentGateway = {
      charge: async ({ orderId }) => {
        calls.push(`transfer for ${orderId}`);
        return { ok: true, receiptId: `BT-${orderId}` };
      },
      refund: async ({ receiptId }) => void calls.push(`return ${receiptId}`)
    };
    const { checkout } = setup({ gateway: bankTransferGateway });
    const order = checkout.placeOrder({ lines: bookLines() });

    await checkout.pay(order.id);
    await checkout.cancel(order.id);

    expect(calls).toEqual(["transfer for order-1", "return BT-order-1"]);
  });

  it("a new listener, such as an email notifier, reacts to events with no change to checkout", async () => {
    const { checkout } = setup();
    const emails: string[] = [];
    checkout.on(event => {
      if (event.type === "OrderPaid") emails.push(`receipt ${event.receiptId} for ${event.orderId}`);
    });
    const order = checkout.placeOrder({ lines: bookLines() });

    await checkout.pay(order.id);

    expect(emails).toEqual(["receipt receipt-1 for order-1"]);
  });

  it("rule, gateway and listener together run a whole order from placed to shipped", async () => {
    const audit: string[] = [];
    const gateway: PaymentGateway = {
      charge: async ({ amount }) => ({ ok: true, receiptId: `paid-${amount.cents}` }),
      refund: async () => {}
    };
    const { checkout } = setup({ gateway, rules: [bookClubRule] });
    checkout.on(event => void audit.push(event.type));
    const order = checkout.placeOrder({ lines: bookLines(2) });

    await checkout.pay(order.id);
    const shipped = await checkout.ship(order.id);

    expect(shipped.status).toBe("shipped");
    expect(audit).toEqual(["OrderPlaced", "OrderPaid", "OrderShipped"]);
  });
});
