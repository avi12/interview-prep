import { subtotalOf, totalDiscount } from "./discounts.ts";
import { CheckoutError, ErrorCode } from "./errors.ts";
import { createEventBus } from "./events.ts";
import { transitionFor } from "./order.ts";
import { OrderAction, OrderStatus } from "./types.ts";
import type { Money } from "./money.ts";
import type { Checkout, CheckoutOptions, OrderLine, OrderView, PayResult, Transition } from "./types.ts";

type StoredOrder = {
  id: string;
  status: OrderStatus;
  lines: OrderLine[];
  subtotal: Money;
  discount: Money;
  total: Money;
};

const ignoreError = () => {};

const copyLine = (line: OrderLine) => ({ ...line });

const viewOf = (order: StoredOrder): OrderView => ({ ...order, lines: order.lines.map(copyLine) });

const requireValidLine = (line: OrderLine) => {
  if (Number.isSafeInteger(line.quantity) && line.quantity > 0) return;
  throw new CheckoutError({ code: ErrorCode.invalidLine, message: `quantity must be a whole number above zero, got ${line.quantity}` });
};

export const createCheckout = ({ gateway, rules = [], newId, reportError = ignoreError }: CheckoutOptions): Checkout => {
  const orders = new Map<string, StoredOrder>();
  const receiptIds = new Map<string, string>();
  const busyOrderIds = new Set<string>();
  const bus = createEventBus({ reportError });

  const orderFor = (orderId: string) => {
    const order = orders.get(orderId);
    if (order) return order;
    throw new CheckoutError({ code: ErrorCode.unknownOrder, message: `no order ${orderId}` });
  };

  const receiptFor = (orderId: string) => {
    const receiptId = receiptIds.get(orderId);
    if (receiptId) return receiptId;
    throw new Error(`order ${orderId} is paid but has no receipt`);
  };

  const run = async <Result>({
    orderId,
    action,
    work
  }: {
    orderId: string;
    action: OrderAction;
    work: (input: { order: StoredOrder; transition: Transition }) => Promise<Result>;
  }) => {
    const order = orderFor(orderId);
    if (busyOrderIds.has(orderId)) {
      throw new CheckoutError({ code: ErrorCode.invalidTransition, message: `cannot ${action} order ${orderId} while another operation is running` });
    }
    const transition = transitionFor({ status: order.status, action });
    busyOrderIds.add(orderId);
    try {
      return await work({ order, transition });
    } finally {
      busyOrderIds.delete(orderId);
    }
  };

  return {
    placeOrder: ({ lines }) => {
      if (lines.length === 0) throw new CheckoutError({ code: ErrorCode.emptyOrder, message: "an order needs at least one line" });
      for (const line of lines) requireValidLine(line);
      const subtotal = subtotalOf(lines);
      const discount = totalDiscount({ rules, lines });
      const order: StoredOrder = {
        id: newId(),
        status: OrderStatus.placed,
        lines: lines.map(copyLine),
        subtotal,
        discount,
        total: subtotal.subtract(discount)
      };
      orders.set(order.id, order);
      bus.publish({ type: "OrderPlaced", orderId: order.id, total: order.total });
      return viewOf(order);
    },

    getOrder: orderId => viewOf(orderFor(orderId)),

    pay: orderId =>
      run<PayResult>({
        orderId,
        action: OrderAction.pay,
        work: async ({ order, transition }) => {
          const charge = await gateway.charge({ orderId, amount: order.total });
          if (!charge.ok) {
            bus.publish({ type: "PaymentDeclined", orderId, reason: charge.reason });
            return { outcome: "declined", reason: charge.reason, order: viewOf(order) };
          }
          order.status = transition.to;
          receiptIds.set(orderId, charge.receiptId);
          bus.publish({ type: "OrderPaid", orderId, receiptId: charge.receiptId });
          return { outcome: "paid", order: viewOf(order) };
        }
      }),

    ship: orderId =>
      run({
        orderId,
        action: OrderAction.ship,
        work: async ({ order, transition }) => {
          order.status = transition.to;
          bus.publish({ type: "OrderShipped", orderId });
          return viewOf(order);
        }
      }),

    cancel: orderId =>
      run({
        orderId,
        action: OrderAction.cancel,
        work: async ({ order, transition }) => {
          if (transition.refunds) await gateway.refund({ orderId, receiptId: receiptFor(orderId), amount: order.total });
          order.status = transition.to;
          bus.publish({ type: "OrderCancelled", orderId, wasRefunded: transition.refunds });
          return viewOf(order);
        }
      }),

    on: listener => bus.subscribe(listener)
  };
};
