import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { Money } from "#kit/bookstore/money.ts";
import type * as TypesModule from "../starter/orderTypes.ts";
import type * as StatesModule from "../starter/states.ts";
import type * as OrderModule from "../starter/order.ts";

const { IllegalTransitionError, OrderAction, refuse } = await loadImpl<typeof TypesModule>({ testUrl: import.meta.url, file: "orderTypes.ts" });
const { ShippedState, CancelledState } = await loadImpl<typeof StatesModule>({ testUrl: import.meta.url, file: "states.ts" });
const { Order } = await loadImpl<typeof OrderModule>({ testUrl: import.meta.url, file: "order.ts" });

type OrderContext = TypesModule.OrderContext;
type OrderState = TypesModule.OrderState;

const TOTAL = Money.usd(5997);
const ACTIONS = ["pay", "ship", "deliver", "cancel"] as const;
type Action = (typeof ACTIONS)[number];

const PATH_TO = {
  pending: [],
  paid: ["pay"],
  shipped: ["pay", "ship"],
  delivered: ["pay", "ship", "deliver"],
  cancelled: ["cancel"]
} as const satisfies Record<string, readonly Action[]>;

const LEGAL_MOVES: Record<keyof typeof PATH_TO, Partial<Record<Action, string>>> = {
  pending: { pay: "paid", cancel: "cancelled" },
  paid: { ship: "shipped", cancel: "cancelled" },
  shipped: { deliver: "delivered" },
  delivered: {},
  cancelled: {}
};

const newOrder = () => new Order({ id: "order-1", total: TOTAL });

const orderIn = (status: keyof typeof PATH_TO) => {
  const order = newOrder();
  for (const action of PATH_TO[status]) order[action]();
  return order;
};

const errorThrownBy = (action: () => void) => {
  try {
    action();
  } catch (error) {
    return error as InstanceType<typeof IllegalTransitionError>;
  }
  return undefined;
};

const combinations = (Object.keys(PATH_TO) as (keyof typeof PATH_TO)[]).flatMap(status =>
  ACTIONS.map(action => {
    const expected = LEGAL_MOVES[status][action];
    return [status, action, expected ?? "a refusal", expected] as const;
  })
);

describe("the order lifecycle", () => {
  it("starts out pending, with nothing refunded", () => {
    const order = newOrder();

    expect(order.status).toBe("pending");
    expect(order.refunded.toString()).toBe("0.00 USD");
  });

  it("walks the happy path: pay, ship, deliver", () => {
    const order = newOrder();

    order.pay();
    expect(order.status).toBe("paid");
    order.ship();
    expect(order.status).toBe("shipped");
    order.deliver();
    expect(order.status).toBe("delivered");
  });

  it.each(combinations)("from %s, %s leads to %s", (status, action, _label, expected) => {
    const order = orderIn(status);

    if (expected) {
      order[action]();
      expect(order.status).toBe(expected);
      return;
    }
    const error = errorThrownBy(() => order[action]());

    expect(error).toBeInstanceOf(IllegalTransitionError);
    expect(error?.from).toBe(status);
    expect(error?.action).toBe(action);
    expect(order.status).toBe(status);
  });

  it("refuses to ship a cancelled order, and says why", () => {
    const order = orderIn("cancelled");

    const error = errorThrownBy(() => order.ship());

    expect(error?.message).toBe("cannot ship an order that is cancelled");
  });

  it("an illegal move is a domain error, not a silent no-op", () => {
    expect(() => newOrder().ship()).toThrow(IllegalTransitionError);
  });
});

describe("cancelling behaves differently depending on the state", () => {
  it("cancelling a pending order refunds nothing, nothing was paid", () => {
    const order = orderIn("pending");

    order.cancel();

    expect(order.refunded.toString()).toBe("0.00 USD");
  });

  it("cancelling a paid order refunds the whole total", () => {
    const order = orderIn("paid");

    order.cancel();

    expect(order.refunded.toString()).toBe("59.97 USD");
  });

  it("cancelling twice does not refund twice", () => {
    const order = orderIn("paid");
    order.cancel();

    expect(() => order.cancel()).toThrow(IllegalTransitionError);
    expect(order.refunded.toString()).toBe("59.97 USD");
  });

  it("two orders keep their own state and refunds", () => {
    const first = orderIn("paid");
    const second = orderIn("paid");

    first.cancel();

    expect(second.status).toBe("paid");
    expect(second.refunded.toString()).toBe("0.00 USD");
  });
});

describe("a state the author never saw plugs in without changing any of your code", () => {
  class PackingState implements OrderState {
    readonly name = "packing";

    pay() {
      refuse({ from: this.name, action: OrderAction.pay });
    }

    ship(order: OrderContext) {
      order.moveTo(new ShippedState());
    }

    deliver() {
      refuse({ from: this.name, action: OrderAction.deliver });
    }

    cancel(order: OrderContext) {
      order.refund(order.total);
      order.moveTo(new CancelledState());
    }
  }

  class StateSpy implements OrderState {
    readonly name = "spy";
    readonly calls: string[] = [];
    readonly totals: string[] = [];

    pay(order: OrderContext) {
      this.#record({ action: "pay", order });
    }

    ship(order: OrderContext) {
      this.#record({ action: "ship", order });
    }

    deliver(order: OrderContext) {
      this.#record({ action: "deliver", order });
    }

    cancel(order: OrderContext) {
      this.#record({ action: "cancel", order });
    }

    #record({ action, order }: { action: string; order: OrderContext }) {
      this.calls.push(action);
      this.totals.push(order.total.toString());
    }
  }

  const packingOrder = () => new Order({ id: "order-9", total: TOTAL, state: new PackingState() });

  it("an order can start in a state written later", () => {
    expect(packingOrder().status).toBe("packing");
  });

  it("the new state hands over to your own states: ship, then deliver", () => {
    const order = packingOrder();

    order.ship();
    expect(order.status).toBe("shipped");
    order.deliver();
    expect(order.status).toBe("delivered");
  });

  it("the new state can move the order into your cancelled state and refund", () => {
    const order = packingOrder();

    order.cancel();

    expect(order.status).toBe("cancelled");
    expect(order.refunded.toString()).toBe("59.97 USD");
  });

  it("the new state refuses moves it does not allow, with your error type", () => {
    const error = errorThrownBy(() => packingOrder().pay());

    expect(error).toBeInstanceOf(IllegalTransitionError);
    expect(error?.from).toBe("packing");
  });

  it("the order only forwards each call to its current state and decides nothing itself", () => {
    const spy = new StateSpy();
    const order = new Order({ id: "order-9", total: TOTAL, state: spy });

    order.pay();
    order.deliver();
    order.ship();
    order.cancel();

    expect(spy.calls).toEqual(["pay", "deliver", "ship", "cancel"]);
    expect(spy.totals).toEqual(["59.97 USD", "59.97 USD", "59.97 USD", "59.97 USD"]);
    expect(order.status).toBe("spy");
  });
});
