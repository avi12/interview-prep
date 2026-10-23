import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { sequentialIds } from "#kit/ids.ts";
import type {
  Order,
  OrderRequest,
  OrderServiceDependencies,
  OrderValidator,
  PaymentGateway,
  PlaceOrderResult,
  PriceCalculator,
  PricingRule,
  ReceiptSender
} from "../starter/contracts.ts";

type CollaboratorsModule = {
  createOrderValidator: () => OrderValidator;
  createBulkDiscountRule: (input: { minimumQuantity: number; percent: number }) => PricingRule;
  createCouponRule: (input: { code: string; amountCents: number }) => PricingRule;
  createPriceCalculator: (input: { rules: PricingRule[] }) => PriceCalculator;
  createNoReceiptSender: () => ReceiptSender;
};

type ServiceModule = {
  createOrderService: (dependencies: OrderServiceDependencies) => { placeOrder: (request: OrderRequest) => Promise<PlaceOrderResult> };
};

const collaborators = await loadImpl<CollaboratorsModule>({ testUrl: import.meta.url, file: "collaborators.ts" });
const { createOrderService } = await loadImpl<ServiceModule>({ testUrl: import.meta.url, file: "orderService.ts" });

const EMAIL = "ana@example.com";
const BOOK_PRICE_CENTS = 1500;
const BULK_MINIMUM_QUANTITY = 10;
const BULK_PERCENT = 10;
const COUPON_CODE = "WELCOME5";
const COUPON_CENTS = 500;

const requestOf = ({ quantity = 1, couponCode, customerEmail = EMAIL }: { quantity?: number; couponCode?: string; customerEmail?: string } = {}): OrderRequest => ({
  customerEmail,
  lines: [{ sku: "book-1", unitPriceCents: BOOK_PRICE_CENTS, quantity }],
  couponCode
});

const shopRules = () => [
  collaborators.createBulkDiscountRule({ minimumQuantity: BULK_MINIMUM_QUANTITY, percent: BULK_PERCENT }),
  collaborators.createCouponRule({ code: COUPON_CODE, amountCents: COUPON_CENTS })
];

const setup = (overrides: Partial<OrderServiceDependencies> = {}) => {
  const calls: string[] = [];
  const saved: Order[] = [];
  const sent: Order[] = [];
  const charged: { email: string; amountCents: number }[] = [];
  const gateway: PaymentGateway = {
    charge: async input => {
      calls.push("charge");
      charged.push(input);
      return { ok: true };
    }
  };
  const orders = {
    save: async (order: Order) => {
      calls.push("save");
      saved.push(order);
    }
  };
  const receipts = {
    send: async (order: Order) => {
      calls.push("send");
      sent.push(order);
    }
  };
  const dependencies: OrderServiceDependencies = {
    validator: collaborators.createOrderValidator(),
    calculator: collaborators.createPriceCalculator({ rules: shopRules() }),
    gateway,
    orders,
    receipts,
    newId: sequentialIds("order"),
    ...overrides
  };
  return { service: createOrderService(dependencies), calls, saved, sent, charged };
};

describe("one reason to change: each collaborator does one job", () => {
  it("validator accepts a good request", () => {
    expect(collaborators.createOrderValidator().validate(requestOf())).toEqual([]);
  });

  it("validator names a bad email", () => {
    const problems = collaborators.createOrderValidator().validate(requestOf({ customerEmail: "not-an-email" }));

    expect(problems).toEqual(["email is invalid"]);
  });

  it("validator names an order with no lines", () => {
    const problems = collaborators.createOrderValidator().validate({ customerEmail: EMAIL, lines: [] });

    expect(problems).toEqual(["order has no lines"]);
  });

  it("validator rejects zero and fractional quantities", () => {
    const validator = collaborators.createOrderValidator();

    expect(validator.validate(requestOf({ quantity: 0 }))).toEqual(["quantity must be a whole number above zero"]);
    expect(validator.validate(requestOf({ quantity: 1.5 }))).toEqual(["quantity must be a whole number above zero"]);
  });

  it("validator rejects a negative price", () => {
    const request: OrderRequest = { customerEmail: EMAIL, lines: [{ sku: "book-1", unitPriceCents: -1, quantity: 1 }] };

    expect(collaborators.createOrderValidator().validate(request)).toEqual(["price must be a whole number of cents, zero or more"]);
  });

  it("validator reports every problem at once, not just the first", () => {
    const problems = collaborators.createOrderValidator().validate({ customerEmail: "nope", lines: [] });

    expect(problems).toEqual(["email is invalid", "order has no lines"]);
  });

  it("bulk rule discounts only from the configured quantity, using the configured percent", () => {
    const rule = collaborators.createBulkDiscountRule({ minimumQuantity: 3, percent: 20 });

    expect(rule.discountCents(requestOf({ quantity: 2 }))).toBe(0);
    expect(rule.discountCents(requestOf({ quantity: 3 }))).toBe(900);
  });

  it("coupon rule discounts only for its own code", () => {
    const rule = collaborators.createCouponRule({ code: "SAVE7", amountCents: 700 });

    expect(rule.discountCents(requestOf({ couponCode: "SAVE7" }))).toBe(700);
    expect(rule.discountCents(requestOf({ couponCode: "OTHER" }))).toBe(0);
    expect(rule.discountCents(requestOf())).toBe(0);
  });

  it("calculator without rules charges the full subtotal", () => {
    const calculator = collaborators.createPriceCalculator({ rules: [] });

    expect(calculator.priceOf(requestOf({ quantity: 2 }))).toEqual({ subtotalCents: 3000, discountCents: 0, totalCents: 3000 });
  });

  it("calculator adds up every rule", () => {
    const calculator = collaborators.createPriceCalculator({ rules: shopRules() });
    const request = requestOf({ quantity: BULK_MINIMUM_QUANTITY, couponCode: COUPON_CODE });

    expect(calculator.priceOf(request)).toEqual({ subtotalCents: 15000, discountCents: 2000, totalCents: 13000 });
  });

  it("calculator never lets the total drop below zero", () => {
    const calculator = collaborators.createPriceCalculator({ rules: [{ name: "huge", discountCents: () => 999_999 }] });

    expect(calculator.priceOf(requestOf())).toEqual({ subtotalCents: 1500, discountCents: 1500, totalCents: 0 });
  });
});

describe("the service only conducts: validate, price, charge, save, send", () => {
  it("a good order is charged, saved, receipted and returned as paid", async () => {
    const { service, charged, saved, sent } = setup();

    const result = await service.placeOrder(requestOf({ quantity: 2 }));

    expect(result).toEqual({ status: "paid", order: saved[0] });
    expect(saved[0]).toMatchObject({ id: "order-1", customerEmail: EMAIL, totalCents: 3000 });
    expect(charged).toEqual([{ email: EMAIL, amountCents: 3000 }]);
    expect(sent).toEqual(saved);
  });

  it("the steps happen in a safe order: charge, then save, then receipt", async () => {
    const { service, calls } = setup();

    await service.placeOrder(requestOf());

    expect(calls).toEqual(["charge", "save", "send"]);
  });

  it("the customer is charged the discounted total", async () => {
    const { service, charged } = setup();

    await service.placeOrder(requestOf({ quantity: BULK_MINIMUM_QUANTITY, couponCode: COUPON_CODE }));

    expect(charged).toEqual([{ email: EMAIL, amountCents: 13000 }]);
  });

  it("an invalid request is rejected with the validator's problems and nothing else happens", async () => {
    const { service, calls } = setup();

    const result = await service.placeOrder(requestOf({ customerEmail: "nope" }));

    expect(result).toEqual({ status: "rejected", problems: ["email is invalid"] });
    expect(calls).toEqual([]);
  });

  it("a declined card returns the reason and neither saves nor sends a receipt", async () => {
    const gateway: PaymentGateway = { charge: async () => ({ ok: false, reason: "card declined" }) };
    const { service, saved, sent } = setup({ gateway });

    const result = await service.placeOrder(requestOf());

    expect(result).toEqual({ status: "declined", reason: "card declined" });
    expect(saved).toEqual([]);
    expect(sent).toEqual([]);
  });

  it("gives every order its own id from the injected generator", async () => {
    const { service, saved } = setup();

    await service.placeOrder(requestOf());
    await service.placeOrder(requestOf());

    expect(saved.map(order => order.id)).toEqual(["order-1", "order-2"]);
  });

  it("asks the injected validator, not a built-in check", async () => {
    const validator: OrderValidator = { validate: () => ["shop is closed"] };
    const { service, calls } = setup({ validator });

    const result = await service.placeOrder(requestOf());

    expect(result).toEqual({ status: "rejected", problems: ["shop is closed"] });
    expect(calls).toEqual([]);
  });

  it("asks the injected calculator, not a built-in price", async () => {
    const calculator: PriceCalculator = { priceOf: () => ({ subtotalCents: 1, discountCents: 0, totalCents: 4321 }) };
    const { service, charged } = setup({ calculator });

    await service.placeOrder(requestOf());

    expect(charged).toEqual([{ email: EMAIL, amountCents: 4321 }]);
  });
});

describe("a substitute keeps the promise of the type it replaces", () => {
  it("the no-receipt sender resolves and sends nothing, so a paid order completes", async () => {
    const { service, saved } = setup({ receipts: collaborators.createNoReceiptSender() });

    const result = await service.placeOrder(requestOf());

    expect(result.status).toBe("paid");
    expect(saved).toHaveLength(1);
  });

  it("the no-receipt sender can be called on its own without throwing", async () => {
    const sender = collaborators.createNoReceiptSender();

    await expect(sender.send({ id: "order-1", customerEmail: EMAIL, lines: [], totalCents: 0 })).resolves.toBeUndefined();
  });
});

describe("extension: new variants plug in without editing your code", () => {
  const fridayRule: PricingRule = { name: "friday", discountCents: () => 250 };

  it("a pricing rule written in the test lowers the price", () => {
    const calculator = collaborators.createPriceCalculator({ rules: [fridayRule] });

    expect(calculator.priceOf(requestOf())).toEqual({ subtotalCents: 1500, discountCents: 250, totalCents: 1250 });
  });

  it("a new rule combines with the shop's existing rules", () => {
    const calculator = collaborators.createPriceCalculator({ rules: [...shopRules(), fridayRule] });
    const request = requestOf({ quantity: BULK_MINIMUM_QUANTITY, couponCode: COUPON_CODE });

    expect(calculator.priceOf(request).discountCents).toBe(2250);
  });

  it("a new rule reaches the customer's bill through the service", async () => {
    const calculator = collaborators.createPriceCalculator({ rules: [fridayRule] });
    const { service, charged } = setup({ calculator });

    await service.placeOrder(requestOf());

    expect(charged).toEqual([{ email: EMAIL, amountCents: 1250 }]);
  });

  it("a new receipt channel receives the saved order", async () => {
    const texts: string[] = [];
    const textMessageSender: ReceiptSender = { send: async order => void texts.push(`order ${order.id} paid`) };
    const { service } = setup({ receipts: textMessageSender });

    await service.placeOrder(requestOf());

    expect(texts).toEqual(["order order-1 paid"]);
  });

  it("a new payment gateway with its own decline rule is honored", async () => {
    const strictGateway: PaymentGateway = {
      charge: async ({ amountCents }) => (amountCents > 2000 ? { ok: false, reason: "over limit" } : { ok: true })
    };
    const { service } = setup({ gateway: strictGateway });

    expect((await service.placeOrder(requestOf({ quantity: 1 }))).status).toBe("paid");
    expect(await service.placeOrder(requestOf({ quantity: 2 }))).toEqual({ status: "declined", reason: "over limit" });
  });
});
