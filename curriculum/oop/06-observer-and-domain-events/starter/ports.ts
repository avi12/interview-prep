import type { Money } from "#kit/bookstore/money.ts";
import type { OrderLine } from "#kit/bookstore/orders.ts";

export type { EmailMessage, Mailer, OrderLine } from "#kit/bookstore/orders.ts";

export type PlacedOrder = {
  id: string;
  customerEmail: string;
  lines: readonly OrderLine[];
  total: Money;
};

export interface OrderRepository {
  save(order: PlacedOrder): Promise<void>;
  findById(id: string): Promise<PlacedOrder | undefined>;
}

export type StockSale = { isbn: string; quantity: number };

export interface Inventory {
  recordSale(sale: StockSale): Promise<void>;
}

export type PointsAward = { email: string; points: number };

export interface LoyaltyLedger {
  award(award: PointsAward): Promise<void>;
}
