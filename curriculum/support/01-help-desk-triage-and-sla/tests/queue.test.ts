import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Priority = "high" | "medium" | "low";
type Ticket = { id: string; priority: Priority; openedAtMinute: number };
type Module = { orderQueue: (tickets: readonly Ticket[]) => string[] };

const { orderQueue } = await loadImpl<Module>({ testUrl: import.meta.url, file: "queue.ts" });

const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

describe("orderQueue", () => {
  it("answers a crashed critical app before network slowness before routine requests", () => {
    const tickets: Ticket[] = [
      { id: "printer-setup", priority: "low", openedAtMinute: 0 },
      { id: "app-crash", priority: "high", openedAtMinute: 0 },
      { id: "password-reset", priority: "low", openedAtMinute: 0 },
      { id: "slow-network", priority: "medium", openedAtMinute: 0 },
    ];
    expect(orderQueue(tickets)).toEqual(["app-crash", "slow-network", "printer-setup", "password-reset"]);
  });

  it("puts an old low ticket about to breach ahead of a fresh medium one", () => {
    const tickets: Ticket[] = [
      { id: "fresh-medium", priority: "medium", openedAtMinute: 23 * MINUTES_PER_HOUR },
      { id: "old-low", priority: "low", openedAtMinute: 0 },
    ];
    expect(orderQueue(tickets)).toEqual(["old-low", "fresh-medium"]);
  });

  it("does not let new medium tickets starve a low one forever", () => {
    const lowTicket: Ticket = { id: "low", priority: "low", openedAtMinute: 0 };
    const mediumTickets: Ticket[] = Array.from({ length: HOURS_PER_DAY }, (_, hour) => ({
      id: `medium-${hour}`,
      priority: "medium",
      openedAtMinute: hour * MINUTES_PER_HOUR,
    }));
    const order = orderQueue([...mediumTickets, lowTicket]);
    expect(order.indexOf("low")).toBeLessThan(order.indexOf("medium-23"));
    expect(order.indexOf("low")).toBeGreaterThan(order.indexOf("medium-21"));
  });

  it("breaks a deadline tie by putting the higher priority first", () => {
    const tickets: Ticket[] = [
      { id: "medium-early", priority: "medium", openedAtMinute: 0 },
      { id: "high-later", priority: "high", openedAtMinute: 90 },
    ];
    expect(orderQueue(tickets)).toEqual(["high-later", "medium-early"]);
  });

  it("keeps the arrival order when deadline and priority are both equal", () => {
    const tickets: Ticket[] = [
      { id: "second-in", priority: "high", openedAtMinute: 5 },
      { id: "first-in", priority: "high", openedAtMinute: 5 },
    ];
    expect(orderQueue(tickets)).toEqual(["second-in", "first-in"]);
  });

  it("returns an empty list for an empty queue", () => {
    expect(orderQueue([])).toEqual([]);
  });

  it("does not reorder the array it was given", () => {
    const tickets = Object.freeze([
      { id: "low", priority: "low", openedAtMinute: 0 },
      { id: "high", priority: "high", openedAtMinute: 0 },
    ] satisfies Ticket[]);
    expect(orderQueue(tickets)).toEqual(["high", "low"]);
    expect(tickets.map(ticket => ticket.id)).toEqual(["low", "high"]);
  });
});
