import type { EmailMessage, Mailer, OrderRepository, PlacedOrder } from "./ports.ts";

export class InMemoryOrderRepository implements OrderRepository {
  async save(_order: PlacedOrder): Promise<void> {
    throw new Error("not implemented");
  }

  async findById(_id: string): Promise<PlacedOrder | undefined> {
    throw new Error("not implemented");
  }

  async list(): Promise<PlacedOrder[]> {
    throw new Error("not implemented");
  }
}

export class RecordingMailer implements Mailer {
  readonly sent: EmailMessage[] = [];

  async send(_message: EmailMessage): Promise<void> {
    throw new Error("not implemented");
  }
}
