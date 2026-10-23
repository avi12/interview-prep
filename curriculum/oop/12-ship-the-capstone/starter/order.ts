import type { OrderAction, OrderStatus, Transition } from "./types.ts";

export function transitionFor(_input: {
  status: OrderStatus;
  action: OrderAction;
}): Transition {
  throw new Error("not implemented");
}
