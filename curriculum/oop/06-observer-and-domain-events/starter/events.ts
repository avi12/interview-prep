import type { Money } from "#kit/bookstore/money.ts";
import type { OrderLine } from "./ports.ts";

export const EventType = {
  orderPlaced: "OrderPlaced"
} as const;

export type DomainEvent = { readonly type: string };

export type OrderPlaced = {
  readonly type: typeof EventType.orderPlaced;
  readonly orderId: string;
  readonly customerEmail: string;
  readonly lines: readonly OrderLine[];
  readonly total: Money;
};

export interface Listener<TEvent extends DomainEvent = DomainEvent> {
  handle(event: TEvent): void | Promise<void>;
}
