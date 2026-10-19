import type { FeePolicy, ParkingLot, ParkingLotOptions, SlotChooser } from "./contracts.ts";

export function createBestFitChooser(): SlotChooser {
  throw new Error("not implemented");
}

export function createHourlyFee(_input: { centsPerHour: Record<string, number> }): FeePolicy {
  throw new Error("not implemented");
}

export function createParkingLot(_options: ParkingLotOptions): ParkingLot {
  throw new Error("not implemented");
}
