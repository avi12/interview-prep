import type { Money } from "./money.ts";

export interface OrderLine {
  isbn: string;
  title: string;
  unitPrice: Money;
  quantity: number;
}

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}
