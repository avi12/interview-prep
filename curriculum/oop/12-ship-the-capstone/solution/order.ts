import { CheckoutError, ErrorCode } from "./errors.ts";
import { OrderAction, OrderStatus } from "./types.ts";
import type { Transition } from "./types.ts";

const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderAction, Transition>>> = {
  [OrderStatus.placed]: {
    [OrderAction.pay]: {
      to: OrderStatus.paid,
      refunds: false
    },
    [OrderAction.cancel]: {
      to: OrderStatus.cancelled,
      refunds: false
    }
  },
  [OrderStatus.paid]: {
    [OrderAction.ship]: {
      to: OrderStatus.shipped,
      refunds: false
    },
    [OrderAction.cancel]: {
      to: OrderStatus.cancelled,
      refunds: true
    }
  },
  [OrderStatus.shipped]: {},
  [OrderStatus.cancelled]: {}
};

export function transitionFor({ status, action }: {
  status: OrderStatus;
  action: OrderAction;
}) {
  const transition = TRANSITIONS[status][action];
  if (transition) {
    return transition;
  }

  throw new CheckoutError({
    code: ErrorCode.invalidTransition,
    message: `cannot ${action} an order that is ${status}`
  });
}
