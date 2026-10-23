import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { sequentialIds } from "#kit/ids.ts";
import { DomainError } from "#kit/bookstore/domainError.ts";
import { Money } from "#kit/bookstore/money.ts";
import type * as PortsModule from "../starter/ports.ts";
import type * as CheckoutModule from "../starter/checkout.ts";
import type * as FakesModule from "../starter/fakes.ts";

const { Checkout } = await loadImpl<typeof CheckoutModule>({ testUrl: import.meta.url, file: "checkout.ts" });
const { InMemoryOrderRepository, RecordingMailer } = await loadImpl<typeof FakesModule>({ testUrl: import.meta.url, file: "fakes.ts" });

type ChargeRequest = PortsModule.ChargeRequest;
type ChargeResult = PortsModule.ChargeResult;
type PaymentGateway = PortsModule.PaymentGateway;
type OrderRepository = PortsModule.OrderRepository;
type PlacedOrder = PortsModule.PlacedOrder;

const CUSTOMER = "ana@example.com";
const PAYMENT_TOKEN = "tok_visa";
const BOOKS = [{ isbn: "isbn-1", title: "Clean Code", unitPrice: Money.usd(1999), quantity: 3 }];

class SpyGateway implements PaymentGateway {
  readonly requests: ChargeRequest[] = [];

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.requests.push(request);
    return { status: "approved", transactionId: `tx-${this.requests.length}` };
  }
}

class DecliningGateway implements PaymentGateway {
  async charge(): Promise<ChargeResult> {
    return { status: "declined", reason: "insufficient funds" };
  }
}

class CrashingGateway implements PaymentGateway {
  async charge(): Promise<ChargeResult> {
    throw new Error("network down");
  }
}

class BrokenRepository implements OrderRepository {
  async save(): Promise<void> {
    throw new Error("disk full");
  }

  async findById(): Promise<PlacedOrder | undefined> {
    return undefined;
  }
}

const setup = ({ gateway = new SpyGateway() }: { gateway?: PaymentGateway } = {}) => {
  const orders = new InMemoryOrderRepository();
  const mailer = new RecordingMailer();
  const checkout = new Checkout({ gateway, orders, mailer, newId: sequentialIds("order") });
  return { checkout, orders, mailer };
};

const placeOrder = (checkout: InstanceType<typeof Checkout>) =>
  checkout.placeOrder({ customerEmail: CUSTOMER, lines: BOOKS, paymentToken: PAYMENT_TOKEN });

const show = (money: Money) => money.toString();

const ORDER: PlacedOrder = {
  id: "order-1",
  customerEmail: CUSTOMER,
  lines: BOOKS,
  total: Money.usd(5997),
  transactionId: "tx-1"
};

describe("your in-memory repository behaves like a real one", () => {
  it("finds nothing for an id that was never saved", async () => {
    expect(await new InMemoryOrderRepository().findById("nope")).toBeUndefined();
  });

  it("finds an order after it was saved", async () => {
    const orders = new InMemoryOrderRepository();
    await orders.save(ORDER);

    expect((await orders.findById("order-1"))?.customerEmail).toBe(CUSTOMER);
  });

  it("keeps one row when the same id is saved twice", async () => {
    const orders = new InMemoryOrderRepository();
    await orders.save(ORDER);
    await orders.save({ ...ORDER, customerEmail: "ben@example.com" });

    expect(await orders.list()).toHaveLength(1);
    expect((await orders.findById("order-1"))?.customerEmail).toBe("ben@example.com");
  });

  it("does not share data between two repositories", async () => {
    const first = new InMemoryOrderRepository();
    const second = new InMemoryOrderRepository();
    await first.save(ORDER);

    expect(await second.list()).toEqual([]);
  });
});

describe("your recording mailer", () => {
  it("remembers every message in order", async () => {
    const mailer = new RecordingMailer();
    await mailer.send({ to: "a@example.com", subject: "one", body: "x" });
    await mailer.send({ to: "b@example.com", subject: "two", body: "y" });

    expect(mailer.sent.map(message => message.subject)).toEqual(["one", "two"]);
  });

  it("does not share messages between two mailers", async () => {
    const first = new RecordingMailer();
    const second = new RecordingMailer();
    await first.send({ to: "a@example.com", subject: "one", body: "x" });

    expect(second.sent).toEqual([]);
  });
});

describe("Checkout uses only what it is given", () => {
  it("charges the gateway once, with the order total and the payment token", async () => {
    const gateway = new SpyGateway();
    const { checkout } = setup({ gateway });

    await placeOrder(checkout);

    expect(gateway.requests).toHaveLength(1);
    expect(show(gateway.requests[0].amount)).toBe("59.97 USD");
    expect(gateway.requests[0].paymentToken).toBe(PAYMENT_TOKEN);
  });

  it("returns the id from the id generator it was given", async () => {
    const { checkout } = setup();

    expect(await placeOrder(checkout)).toEqual({ status: "placed", orderId: "order-1" });
  });

  it("saves the order with the transaction id the gateway answered", async () => {
    const { checkout, orders } = setup();

    await placeOrder(checkout);

    const saved = await orders.findById("order-1");
    expect(saved?.transactionId).toBe("tx-1");
    expect(saved?.customerEmail).toBe(CUSTOMER);
    expect(saved?.total.toString()).toBe("59.97 USD");
  });

  it("emails the customer once, naming the order", async () => {
    const { checkout, mailer } = setup();

    await placeOrder(checkout);

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe(CUSTOMER);
    expect(mailer.sent[0].subject).toContain("order-1");
    expect(mailer.sent[0].body).toContain("59.97 USD");
  });

  it("a declined card returns the reason, and saves and emails nothing", async () => {
    const { checkout, orders, mailer } = setup({ gateway: new DecliningGateway() });

    const result = await placeOrder(checkout);

    expect(result).toEqual({ status: "declined", reason: "insufficient funds" });
    expect(await orders.list()).toEqual([]);
    expect(mailer.sent).toEqual([]);
  });

  it("a gateway that crashes stops the checkout: nothing saved, nothing emailed", async () => {
    const { checkout, orders, mailer } = setup({ gateway: new CrashingGateway() });

    await expect(placeOrder(checkout)).rejects.toThrow("network down");
    expect(await orders.list()).toEqual([]);
    expect(mailer.sent).toEqual([]);
  });

  it("an order with no lines is a domain error and never reaches the gateway", async () => {
    const gateway = new SpyGateway();
    const { checkout } = setup({ gateway });

    await expect(checkout.placeOrder({ customerEmail: CUSTOMER, lines: [], paymentToken: PAYMENT_TOKEN })).rejects.toThrow(DomainError);
    expect(gateway.requests).toEqual([]);
  });

  it("does not email when the order could not be saved", async () => {
    const mailer = new RecordingMailer();
    const checkout = new Checkout({ gateway: new SpyGateway(), orders: new BrokenRepository(), mailer, newId: sequentialIds("order") });

    await expect(placeOrder(checkout)).rejects.toThrow("disk full");
    expect(mailer.sent).toEqual([]);
  });

  it("numbers orders with the generator, one id per placed order", async () => {
    const { checkout } = setup();

    const first = await placeOrder(checkout);
    const second = await placeOrder(checkout);

    expect([first, second]).toEqual([
      { status: "placed", orderId: "order-1" },
      { status: "placed", orderId: "order-2" }
    ]);
  });
});

describe("a gateway the author never saw is just another plug", () => {
  class FlatFeeGateway implements PaymentGateway {
    readonly charged: string[] = [];

    async charge({ amount }: ChargeRequest): Promise<ChargeResult> {
      this.charged.push(show(amount));
      return { status: "approved", transactionId: "flat-fee-1" };
    }
  }

  it("works with a gateway written in the test file", async () => {
    const gateway = new FlatFeeGateway();
    const { checkout, orders } = setup({ gateway });

    await placeOrder(checkout);

    expect(gateway.charged).toEqual(["59.97 USD"]);
    expect((await orders.findById("order-1"))?.transactionId).toBe("flat-fee-1");
  });

  it("works with an order repository written in the test file", async () => {
    const saved: PlacedOrder[] = [];
    const orders: OrderRepository = {
      save: async order => {
        saved.push(order);
      },
      findById: async () => undefined
    };
    const checkout = new Checkout({ gateway: new SpyGateway(), orders, mailer: new RecordingMailer(), newId: sequentialIds("order") });

    await placeOrder(checkout);

    expect(saved.map(order => order.id)).toEqual(["order-1"]);
  });

  it("works with a mailer written in the test file", async () => {
    const subjects: string[] = [];
    const mailer = {
      send: async ({ subject }: { subject: string }) => {
        subjects.push(subject);
      }
    };
    const checkout = new Checkout({ gateway: new SpyGateway(), orders: new InMemoryOrderRepository(), mailer, newId: sequentialIds("order") });

    await placeOrder(checkout);

    expect(subjects).toHaveLength(1);
  });
});
