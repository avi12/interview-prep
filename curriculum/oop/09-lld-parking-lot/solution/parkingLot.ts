import type { FeePolicy, ParkingLot, ParkingLotOptions, ParkResult, LeaveResult, Slot, SlotChooser, Ticket, Vehicle } from "./contracts.ts";

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const MINIMUM_HOURS = 1;

export const createBestFitChooser = (): SlotChooser => ({
  choose: ({ candidates }) => {
    let best: Slot | undefined;
    for (const candidate of candidates) if (!best || candidate.size < best.size) best = candidate;
    return best;
  }
});

export const createHourlyFee = ({ centsPerHour }: { centsPerHour: Record<string, number> }): FeePolicy => ({
  feeCents: ({ vehicle, minutes }) => {
    const rate = centsPerHour[vehicle.type.name];
    if (rate === undefined) throw new Error(`no hourly rate for ${vehicle.type.name}`);
    const hours = Math.max(MINIMUM_HOURS, Math.ceil(minutes / MINUTES_PER_HOUR));
    return hours * rate;
  }
});

export const createParkingLot = ({ slots, chooser, fees, clock, newTicketId }: ParkingLotOptions): ParkingLot => {
  const occupiedSlotIds = new Set<string>();
  const parkedPlates = new Set<string>();
  const parkedByTicketId = new Map<string, { ticket: Ticket; vehicle: Vehicle }>();

  const candidatesFor = (vehicle: Vehicle) =>
    slots.filter(slot => !occupiedSlotIds.has(slot.id) && slot.size >= vehicle.type.size);

  const park = (vehicle: Vehicle): ParkResult => {
    if (parkedPlates.has(vehicle.plate)) return { ok: false, reason: "already-parked" };
    const slot = chooser.choose({ candidates: candidatesFor(vehicle), vehicle });
    if (!slot) return { ok: false, reason: "full" };
    const ticket = { id: newTicketId(), plate: vehicle.plate, slotId: slot.id, enteredAtMs: clock.nowMs() };
    occupiedSlotIds.add(slot.id);
    parkedPlates.add(vehicle.plate);
    parkedByTicketId.set(ticket.id, { ticket, vehicle });
    return { ok: true, ticket };
  };

  const leave = (ticketId: string): LeaveResult => {
    const parked = parkedByTicketId.get(ticketId);
    if (!parked) return { ok: false, reason: "unknown-ticket" };
    const minutes = Math.ceil((clock.nowMs() - parked.ticket.enteredAtMs) / MS_PER_MINUTE);
    const feeCents = fees.feeCents({ vehicle: parked.vehicle, minutes });
    occupiedSlotIds.delete(parked.ticket.slotId);
    parkedPlates.delete(parked.vehicle.plate);
    parkedByTicketId.delete(ticketId);
    return { ok: true, feeCents, minutes };
  };

  return { park, leave, freeSlotCount: () => slots.length - occupiedSlotIds.size };
};
