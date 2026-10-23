import type * as BusModule from "../starter/eventBus.ts";
import type * as EventsModule from "../starter/events.ts";
import type * as FakesModule from "../starter/fakes.ts";
import type * as ListenersModule from "../starter/listeners.ts";
import type * as PlaceOrderModule from "../starter/placeOrder.ts";
import { nextTick } from "#kit/async.ts";
import { DomainError } from "#kit/bookstore/domainError.ts";
import { Money } from "#kit/bookstore/money.ts";
import { sequentialIds } from "#kit/ids.ts";
import { loadImpl } from "#kit/impl.ts";
import { describe, expect, it } from "vitest";

const { EventType } = await loadImpl<typeof EventsModule>({
  testUrl: import.meta.url,
  file: "events.ts"
});
const { EventBus } = await loadImpl<typeof BusModule>({
  testUrl: import.meta.url,
  file: "eventBus.ts"
});
const { createPlaceOrder } = await loadImpl<typeof PlaceOrderModule>({
  testUrl: import.meta.url,
  file: "placeOrder.ts"
});
const { ConfirmationEmailListener, StockListener, LoyaltyListener } = await loadImpl<typeof ListenersModule>({
  testUrl: import.meta.url,
  file: "listeners.ts"
});
const {
  InMemoryOrderRepository,
  RecordingMailer,
  RecordingInventory,
  RecordingLedger
} = await loadImpl<typeof FakesModule>({
  testUrl: import.meta.url,
  file: "fakes.ts"
});

type DomainEvent = EventsModule.DomainEvent;
type Listener<TEvent extends DomainEvent = DomainEvent> = EventsModule.Listener<TEvent>;
type OrderPlaced = EventsModule.OrderPlaced;
type ListenerFailure = BusModule.ListenerFailure;

const CUSTOMER = "ana@example.com";
const BOOKS = [
  {
    isbn: "isbn-1",
    title: "Clean Code",
    unitPrice: Money.usd(1999),
    quantity: 3
  },
  {
    isbn: "isbn-2",
    title: "The Pragmatic Programmer",
    unitPrice: Money.usd(500),
    quantity: 1
  }
];

function setupBus() {
  const failures: ListenerFailure[] = [];
  const bus = new EventBus({ onListenerError: failure => failures.push(failure) });
  return {
    bus,
    failures
  };
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function eventNamed(type: string): DomainEvent {
  return { type };
}

function orderPlacedEvent(overrides: Partial<OrderPlaced> = {}): OrderPlaced {
  return {
    type: EventType.orderPlaced,
    orderId: "order-1",
    customerEmail: CUSTOMER,
    lines: BOOKS,
    total: Money.usd(6497),
    ...overrides
  };
}

class LogListener implements Listener {
  readonly #name: string;
  readonly #log: string[];

  constructor({ name, log }: {
    name: string;
    log: string[];
  }) {
    this.#name = name;
    this.#log = log;
  }

  handle() {
    this.#log.push(this.#name);
  }
}

describe("EventBus", () => {
  it("calls every listener of the event type, in the order they subscribed", async () => {
    const { bus } = setupBus();
    const log: string[] = [];
    bus.subscribe(
      "Ping", new LogListener({
        name: "first",
        log
      })
    );
    bus.subscribe(
      "Ping", new LogListener({
        name: "second",
        log
      })
    );
    bus.subscribe(
      "Ping", new LogListener({
        name: "third",
        log
      })
    );

    await bus.publish(eventNamed("Ping"));

    expect(log).toEqual(["first", "second", "third"]);
  });

  it("does not call listeners of other event types", async () => {
    const { bus } = setupBus();
    const log: string[] = [];
    bus.subscribe(
      "Ping", new LogListener({
        name: "ping",
        log
      })
    );
    bus.subscribe(
      "Pong", new LogListener({
        name: "pong",
        log
      })
    );

    await bus.publish(eventNamed("Pong"));

    expect(log).toEqual(["pong"]);
  });

  it("hands the same event to the listener", async () => {
    const { bus } = setupBus();
    const received: DomainEvent[] = [];
    bus.subscribe("Ping", { handle: event => void received.push(event) });
    const event = eventNamed("Ping");

    await bus.publish(event);

    expect(received).toEqual([event]);
  });

  it("publishing an event nobody listens to is fine", async () => {
    const { bus, failures } = setupBus();

    await expect(bus.publish(eventNamed("Nobody"))).resolves.toBeUndefined();
    expect(failures).toEqual([]);
  });

  it("waits for a slow listener to finish before it calls the next one", async () => {
    const { bus } = setupBus();
    const log: string[] = [];
    bus.subscribe("Ping", {
      async handle() {
        log.push("slow starts");
        await nextTick();
        log.push("slow ends");
      }
    });
    bus.subscribe("Ping", { handle: () => void log.push("next") });

    await bus.publish(eventNamed("Ping"));

    expect(log).toEqual(["slow starts", "slow ends", "next"]);
  });

  it("publish only resolves after every listener has finished", async () => {
    const { bus } = setupBus();
    let isFinished = false;
    bus.subscribe("Ping", {
      async handle() {
        await nextTick();
        isFinished = true;
      }
    });

    await bus.publish(eventNamed("Ping"));

    expect(isFinished).toBe(true);
  });

  it("a listener that throws does not stop the others, and the failure is reported", async () => {
    const { bus, failures } = setupBus();
    const log: string[] = [];
    const broken: Listener = {
      handle() {
        throw new Error("mail server down");
      }
    };
    bus.subscribe("Ping", broken);
    bus.subscribe(
      "Ping", new LogListener({
        name: "after",
        log
      })
    );
    const event = eventNamed("Ping");

    await bus.publish(event);

    expect(log).toEqual(["after"]);
    expect(failures).toHaveLength(1);
    expect(failures[0].event).toBe(event);
    expect(failures[0].listener).toBe(broken);
    expect(messageOf(failures[0].error)).toBe("mail server down");
  });

  it("a listener that rejects is reported too", async () => {
    const { bus, failures } = setupBus();
    bus.subscribe("Ping", { handle: async () => Promise.reject(new Error("async failure")) });

    await bus.publish(eventNamed("Ping"));

    expect(failures.map(failure => messageOf(failure.error))).toEqual(["async failure"]);
  });

  it("stops calling a listener after it unsubscribes", async () => {
    const { bus } = setupBus();
    const log: string[] = [];
    const unsubscribe = bus.subscribe(
      "Ping", new LogListener({
        name: "gone",
        log
      })
    );
    bus.subscribe(
      "Ping", new LogListener({
        name: "stays",
        log
      })
    );

    unsubscribe();
    await bus.publish(eventNamed("Ping"));

    expect(log).toEqual(["stays"]);
  });

  it("a listener added while publishing is not called for that event", async () => {
    const { bus } = setupBus();
    const log: string[] = [];
    bus.subscribe("Ping", {
      handle() {
        bus.subscribe(
          "Ping", new LogListener({
            name: "late",
            log
          })
        );
      }
    });

    await bus.publish(eventNamed("Ping"));
    expect(log).toEqual([]);

    await bus.publish(eventNamed("Ping"));
    expect(log).toEqual(["late"]);
  });

  it("two buses do not share listeners", async () => {
    const first = setupBus().bus;
    const second = setupBus().bus;
    const log: string[] = [];
    first.subscribe(
      "Ping", new LogListener({
        name: "first only",
        log
      })
    );

    await second.publish(eventNamed("Ping"));

    expect(log).toEqual([]);
  });
});

describe("the three listeners", () => {
  it("ConfirmationEmailListener emails the customer, naming the order", async () => {
    const mailer = new RecordingMailer();

    await new ConfirmationEmailListener({ mailer }).handle(orderPlacedEvent());

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe(CUSTOMER);
    expect(mailer.sent[0].subject).toContain("order-1");
  });

  it("StockListener records a sale for every line, in order", async () => {
    const inventory = new RecordingInventory();

    await new StockListener({ inventory }).handle(orderPlacedEvent());

    expect(inventory.sales).toEqual([
      {
        isbn: "isbn-1",
        quantity: 3
      },
      {
        isbn: "isbn-2",
        quantity: 1
      }
    ]);
  });

  it("LoyaltyListener awards one point per whole dollar: 64.97 USD is 64 points", async () => {
    const ledger = new RecordingLedger();

    await new LoyaltyListener({ ledger }).handle(orderPlacedEvent());

    expect(ledger.awards).toEqual([{
      email: CUSTOMER,
      points: 64
    }]);
  });

  it("LoyaltyListener records nothing for an order under one dollar", async () => {
    const ledger = new RecordingLedger();

    await new LoyaltyListener({ ledger }).handle(orderPlacedEvent({ total: Money.usd(99) }));

    expect(ledger.awards).toEqual([]);
  });
});

describe("placeOrder announces a fact and knows nothing about who listens", () => {
  function setupPlaceOrder() {
    const { bus, failures } = setupBus();
    const orders = new InMemoryOrderRepository();
    const placeOrder = createPlaceOrder({
      orders,
      bus,
      newId: sequentialIds("order")
    });
    return {
      bus,
      failures,
      orders,
      placeOrder
    };
  }

  it("saves the order and returns its id", async () => {
    const { placeOrder, orders } = setupPlaceOrder();

    const result = await placeOrder({
      customerEmail: CUSTOMER,
      lines: BOOKS
    });

    expect(result).toEqual({ orderId: "order-1" });
    expect((await orders.findById("order-1"))?.total.toString()).toBe("64.97 USD");
  });

  it("works with nobody listening", async () => {
    const { placeOrder } = setupPlaceOrder();

    await expect(
      placeOrder({
        customerEmail: CUSTOMER,
        lines: BOOKS
      })
    ).resolves.toEqual({ orderId: "order-1" });
  });

  it("publishes one OrderPlaced event with the order details", async () => {
    const { bus, placeOrder } = setupPlaceOrder();
    const received: OrderPlaced[] = [];
    bus.subscribe<OrderPlaced>(EventType.orderPlaced, { handle: event => void received.push(event) });

    await placeOrder({
      customerEmail: CUSTOMER,
      lines: BOOKS
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("OrderPlaced");
    expect(received[0].orderId).toBe("order-1");
    expect(received[0].customerEmail).toBe(CUSTOMER);
    expect(received[0].lines.map(line => line.isbn)).toEqual(["isbn-1", "isbn-2"]);
    expect(received[0].total.toString()).toBe("64.97 USD");
  });

  it("saves the order before it announces it, so a listener can already find it", async () => {
    const { bus, placeOrder, orders } = setupPlaceOrder();
    const foundWhileListening: boolean[] = [];
    bus.subscribe<OrderPlaced>(EventType.orderPlaced, {
      async handle(event) {
        foundWhileListening.push((await orders.findById(event.orderId)) !== undefined);
      }
    });

    await placeOrder({
      customerEmail: CUSTOMER,
      lines: BOOKS
    });

    expect(foundWhileListening).toEqual([true]);
  });

  it("an order with no lines is a domain error, with no event and nothing saved", async () => {
    const { bus, placeOrder, orders } = setupPlaceOrder();
    const log: string[] = [];
    bus.subscribe(
      EventType.orderPlaced, new LogListener({
        name: "heard",
        log
      })
    );

    await expect(
      placeOrder({
        customerEmail: CUSTOMER,
        lines: []
      })
    ).rejects.toThrow(DomainError);
    expect(log).toEqual([]);
    expect(await orders.list()).toEqual([]);
  });

  it("a failing listener does not undo or fail the order", async () => {
    const { bus, failures, placeOrder, orders } = setupPlaceOrder();
    bus.subscribe(EventType.orderPlaced, {
      handle() {
        throw new Error("mail server down");
      }
    });

    const result = await placeOrder({
      customerEmail: CUSTOMER,
      lines: BOOKS
    });

    expect(result).toEqual({ orderId: "order-1" });
    expect(await orders.list()).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });
});

describe("wired together, and a new listener plugs in without changing placeOrder", () => {
  class AnalyticsListener implements Listener<OrderPlaced> {
    readonly tracked: string[] = [];

    handle({ orderId, total }: OrderPlaced) {
      this.tracked.push(`${orderId}:${total}`);
    }
  }

  class OrderShippedListener implements Listener {
    readonly heard: string[] = [];

    handle(event: DomainEvent) {
      this.heard.push(event.type);
    }
  }

  function wire() {
    const { bus, failures } = setupBus();
    const orders = new InMemoryOrderRepository();
    const mailer = new RecordingMailer();
    const inventory = new RecordingInventory();
    const ledger = new RecordingLedger();
    bus.subscribe(EventType.orderPlaced, new ConfirmationEmailListener({ mailer }));
    bus.subscribe(EventType.orderPlaced, new StockListener({ inventory }));
    bus.subscribe(EventType.orderPlaced, new LoyaltyListener({ ledger }));
    const placeOrder = createPlaceOrder({
      orders,
      bus,
      newId: sequentialIds("order")
    });
    return {
      bus,
      failures,
      mailer,
      inventory,
      ledger,
      placeOrder
    };
  }

  function wireWithBrokenFirstListener() {
    const { bus, failures } = setupBus();
    const orders = new InMemoryOrderRepository();
    const inventory = new RecordingInventory();
    const ledger = new RecordingLedger();
    bus.subscribe(EventType.orderPlaced, {
      handle() {
        throw new Error("mail server down");
      }
    });
    bus.subscribe(EventType.orderPlaced, new StockListener({ inventory }));
    bus.subscribe(EventType.orderPlaced, new LoyaltyListener({ ledger }));
    const placeOrder = createPlaceOrder({
      orders,
      bus,
      newId: sequentialIds("order")
    });
    return {
      failures,
      inventory,
      ledger,
      placeOrder
    };
  }

  it("placing one order emails, updates stock and awards points", async () => {
    const { placeOrder, mailer, inventory, ledger } = wire();

    await placeOrder({
      customerEmail: CUSTOMER,
      lines: BOOKS
    });

    expect(mailer.sent).toHaveLength(1);
    expect(inventory.sales).toHaveLength(2);
    expect(ledger.awards).toEqual([{
      email: CUSTOMER,
      points: 64
    }]);
  });

  it("an analytics listener written later receives the event and the others still run", async () => {
    const { bus, placeOrder, mailer, ledger } = wire();
    const analytics = new AnalyticsListener();
    bus.subscribe(EventType.orderPlaced, analytics);

    await placeOrder({
      customerEmail: CUSTOMER,
      lines: BOOKS
    });

    expect(analytics.tracked).toEqual(["order-1:64.97 USD"]);
    expect(mailer.sent).toHaveLength(1);
    expect(ledger.awards).toHaveLength(1);
  });

  it("one failing listener does not stop the stock and points listeners that come after it", async () => {
    const { failures, placeOrder, inventory, ledger } = wireWithBrokenFirstListener();

    await placeOrder({
      customerEmail: CUSTOMER,
      lines: BOOKS
    });

    expect(failures).toHaveLength(1);
    expect(inventory.sales).toHaveLength(2);
    expect(ledger.awards).toHaveLength(1);
  });

  it("the bus is not tied to orders: it carries an event type nobody planned for", async () => {
    const { bus } = wire();
    const shipped = new OrderShippedListener();
    bus.subscribe("OrderShipped", shipped);

    await bus.publish(eventNamed("OrderShipped"));
    await bus.publish(eventNamed("SomethingElse"));

    expect(shipped.heard).toEqual(["OrderShipped"]);
  });
});
