import type { Money } from "./money.ts";

export type OrderLine = { isbn: string; title: string; unitPrice: Money; quantity: number };

export type EmailMessage = { to: string; subject: string; body: string };

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}
