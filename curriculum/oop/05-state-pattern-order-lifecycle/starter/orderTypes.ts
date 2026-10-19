import { DomainError } from "#kit/bookstore/domainError.ts";
import type { Money } from "#kit/bookstore/money.ts";

export const OrderStatus = {
  pending: "pending",
  paid: "paid",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled"
} as const;

export const OrderAction = {
  pay: "pay",
  ship: "ship",
  deliver: "deliver",
  cancel: "cancel"
} as const;

export class IllegalTransitionError extends DomainError {
  readonly from: string;
  readonly action: string;

  constructor({ from, action }: { from: string; action: string }) {
    super(`cannot ${action} an order that is ${from}`);
    this.from = from;
    this.action = action;
  }
}

export interface OrderContext {
  readonly total: Money;
  moveTo(state: OrderState): void;
  refund(amount: Money): void;
}

export interface OrderState {
  readonly name: string;
  pay(order: OrderContext): void;
  ship(order: OrderContext): void;
  deliver(order: OrderContext): void;
  cancel(order: OrderContext): void;
}

export const refuse = ({ from, action }: { from: string; action: string }): never => {
  throw new IllegalTransitionError({ from, action });
};
