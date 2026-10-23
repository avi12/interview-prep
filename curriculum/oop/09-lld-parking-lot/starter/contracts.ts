export type VehicleType = {
  name: string;
  size: number;
};

export type Vehicle = {
  plate: string;
  type: VehicleType;
};

export type Slot = {
  id: string;
  size: number;
};

export type Ticket = {
  id: string;
  plate: string;
  slotId: string;
  enteredAtMs: number;
};

export type SlotChooser = { choose: (input: {
  candidates: Slot[];
  vehicle: Vehicle;
}) => Slot | undefined; };

export type FeePolicy = { feeCents: (input: {
  vehicle: Vehicle;
  minutes: number;
}) => number; };

export type Clock = { nowMs: () => number };

export type ParkResult = {
  ok: true;
  ticket: Ticket;
} | {
  ok: false;
  reason: "full" | "already-parked";
};

export type LeaveResult = {
  ok: true;
  feeCents: number;
  minutes: number;
} | {
  ok: false;
  reason: "unknown-ticket";
};

export type ParkingLotOptions = {
  slots: Slot[];
  chooser: SlotChooser;
  fees: FeePolicy;
  clock: Clock;
  newTicketId: () => string;
};

export type ParkingLot = {
  park: (vehicle: Vehicle) => ParkResult;
  leave: (ticketId: string) => LeaveResult;
  freeSlotCount: () => number;
};
