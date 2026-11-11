export const RESPONSE_MINUTES = { high: 30, medium: 120, low: 1440 } as const;

export type Priority = keyof typeof RESPONSE_MINUTES;

export type Ticket = { id: string; priority: Priority; openedAtMinute: number };

export function orderQueue(tickets: readonly Ticket[]): string[] {
  return [];
}
