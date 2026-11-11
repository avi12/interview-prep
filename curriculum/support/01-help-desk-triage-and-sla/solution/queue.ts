export const RESPONSE_MINUTES = { high: 30, medium: 120, low: 1440 } as const;

export type Priority = keyof typeof RESPONSE_MINUTES;

export type Ticket = { id: string; priority: Priority; openedAtMinute: number };

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const satisfies Record<Priority, number>;

const deadlineOf = (ticket: Ticket) => ticket.openedAtMinute + RESPONSE_MINUTES[ticket.priority];

export function orderQueue(tickets: readonly Ticket[]) {
  return [...tickets]
    .sort((first, second) => {
      const deadlineGap = deadlineOf(first) - deadlineOf(second);
      if (deadlineGap !== 0) return deadlineGap;
      return PRIORITY_RANK[first.priority] - PRIORITY_RANK[second.priority];
    })
    .map(ticket => ticket.id);
}
