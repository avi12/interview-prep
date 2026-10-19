import type {
  EmailMessage,
  Inventory,
  LoyaltyLedger,
  Mailer,
  OrderRepository,
  PlacedOrder,
  PointsAward,
  StockSale
} from "./ports.ts";

export class InMemoryOrderRepository implements OrderRepository {
  readonly #ordersById = new Map<string, PlacedOrder>();

  async save(order: PlacedOrder) {
    this.#ordersById.set(order.id, order);
  }

  async findById(id: string) {
    return this.#ordersById.get(id);
  }

  async list() {
    return [...this.#ordersById.values()];
  }
}

export class RecordingMailer implements Mailer {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage) {
    this.sent.push({ ...message });
  }
}

export class RecordingInventory implements Inventory {
  readonly sales: StockSale[] = [];

  async recordSale(sale: StockSale) {
    this.sales.push({ ...sale });
  }
}

export class RecordingLedger implements LoyaltyLedger {
  readonly awards: PointsAward[] = [];

  async award(award: PointsAward) {
    this.awards.push({ ...award });
  }
}
