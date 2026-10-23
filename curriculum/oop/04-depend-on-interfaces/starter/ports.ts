import type { Money } from "#kit/bookstore/money.ts";
import type { OrderLine } from "#kit/bookstore/orders.ts";

export type { EmailMessage, Mailer, OrderLine } from "#kit/bookstore/orders.ts";

export type PlacedOrder = {
  id: string;
  customerEmail: string;
  lines: readonly OrderLine[];
  total: Money;
  transactionId: string;
};

export type ChargeRequest = {
  amount: Money;
  paymentToken: string;
};

export type ChargeResult =
  | {
    status: "approved";
    transactionId: string;
  }
  | {
    status: "declined";
    reason: string;
  };

export interface PaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

export interface OrderRepository {
  save(order: PlacedOrder): Promise<void>;
  findById(id: string): Promise<PlacedOrder | undefined>;
}
