import type {
  FeePolicy,
  ParkingLot,
  ParkingLotOptions,
  Slot,
  SlotChooser,
  Ticket,
  Vehicle,
  VehicleType
} from "../starter/contracts.ts";
import { loadImpl } from "#kit/impl.ts";
import { describe, expect, it } from "vitest";

type Module = {
  createParkingLot: (options: ParkingLotOptions) => ParkingLot;
  createBestFitChooser: () => SlotChooser;
  createHourlyFee: (input: { centsPerHour: Record<string, number> }) => FeePolicy;
};

const { createParkingLot, createBestFitChooser, createHourlyFee } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "parkingLot.ts"
});

const MOTORCYCLE: VehicleType = {
  name: "motorcycle",
  size: 1
};
const CAR: VehicleType = {
  name: "car",
  size: 2
};
const TRUCK: VehicleType = {
  name: "truck",
  size: 3
};
const RATES = {
  motorcycle: 100,
  car: 200,
  truck: 500
};
const MS_PER_MINUTE = 60_000;

const SLOTS: Slot[] = [
  {
    id: "small-1",
    size: 1
  },
  {
    id: "medium-1",
    size: 2
  },
  {
    id: "medium-2",
    size: 2
  },
  {
    id: "large-1",
    size: 3
  }
];

function vehicle({ plate, type }: {
  plate: string;
  type: VehicleType;
}): Vehicle {
  return {
    plate,
    type
  };
}

function setup(overrides: Partial<ParkingLotOptions> = {}) {
  let nowMs = 0;
  let ticketCount = 0;
  const lot = createParkingLot({
    slots: SLOTS,
    chooser: createBestFitChooser(),
    fees: createHourlyFee({ centsPerHour: RATES }),
    clock: {
      nowMs: () => nowMs
    },
    newTicketId: () => `ticket-${++ticketCount}`,
    ...overrides
  });
  function advanceMinutes(minutes: number) {
    nowMs += minutes * MS_PER_MINUTE;
  }
  function parkOk(candidate: Vehicle): Ticket {
    const result = lot.park(candidate);
    if (!result.ok) {
      throw new Error(`expected ${candidate.plate} to park, got ${result.reason}`);
    }

    return result.ticket;
  }
  return {
    lot,
    advanceMinutes,
    parkOk
  };
}

describe("parking", () => {
  it("returns a ticket for the plate, in a slot the vehicle fits", () => {
    const { parkOk } = setup();

    const ticket = parkOk(
      vehicle({
        plate: "CAR-1",
        type: CAR
      })
    );

    expect(ticket.plate).toBe("CAR-1");
    expect(["medium-1", "medium-2", "large-1"]).toContain(ticket.slotId);
  });

  it("best fit: a motorcycle takes the smallest slot, the next one the smallest left", () => {
    const { parkOk } = setup();

    expect(
      parkOk(
        vehicle({
          plate: "M-1",
          type: MOTORCYCLE
        })
      ).slotId
    ).toBe("small-1");
    expect(
      parkOk(
        vehicle({
          plate: "M-2",
          type: MOTORCYCLE
        })
      ).slotId
    ).toBe("medium-1");
  });

  it("best fit keeps the large slot free while a medium one is available", () => {
    const { parkOk } = setup();

    expect(
      parkOk(
        vehicle({
          plate: "CAR-1",
          type: CAR
        })
      ).slotId
    ).toBe("medium-1");
    expect(
      parkOk(
        vehicle({
          plate: "CAR-2",
          type: CAR
        })
      ).slotId
    ).toBe("medium-2");
    expect(
      parkOk(
        vehicle({
          plate: "CAR-3",
          type: CAR
        })
      ).slotId
    ).toBe("large-1");
  });

  it("a truck fits only the large slot, so a second truck is refused as full", () => {
    const { lot, parkOk } = setup();
    parkOk(
      vehicle({
        plate: "T-1",
        type: TRUCK
      })
    );

    expect(
      lot.park(
        vehicle({
          plate: "T-2",
          type: TRUCK
        })
      )
    ).toEqual({
      ok: false,
      reason: "full"
    });
  });

  it("a refused vehicle changes nothing", () => {
    const { lot, parkOk } = setup();
    parkOk(
      vehicle({
        plate: "T-1",
        type: TRUCK
      })
    );
    const freeBefore = lot.freeSlotCount();

    lot.park(
      vehicle({
        plate: "T-2",
        type: TRUCK
      })
    );

    expect(lot.freeSlotCount()).toBe(freeBefore);
  });

  it("the same plate cannot be parked twice", () => {
    const { lot, parkOk } = setup();
    parkOk(
      vehicle({
        plate: "CAR-1",
        type: CAR
      })
    );

    expect(
      lot.park(
        vehicle({
          plate: "CAR-1",
          type: CAR
        })
      )
    ).toEqual({
      ok: false,
      reason: "already-parked"
    });
  });

  it("counts free slots as vehicles come and go", () => {
    const { lot, parkOk } = setup();
    expect(lot.freeSlotCount()).toBe(4);

    const ticket = parkOk(
      vehicle({
        plate: "CAR-1",
        type: CAR
      })
    );
    expect(lot.freeSlotCount()).toBe(3);

    lot.leave(ticket.id);
    expect(lot.freeSlotCount()).toBe(4);
  });

  it("the chooser is given only free slots that fit, and the lot parks where it points", () => {
    const seen: string[][] = [];
    const recordingChooser: SlotChooser = {
      choose({ candidates }) {
        seen.push(candidates.map(slot => slot.id));
        return candidates[0];
      }
    };
    const { parkOk } = setup({ chooser: recordingChooser });
    parkOk(
      vehicle({
        plate: "CAR-1",
        type: CAR
      })
    );

    const ticket = parkOk(
      vehicle({
        plate: "CAR-2",
        type: CAR
      })
    );

    expect(seen).toEqual([["medium-1", "medium-2", "large-1"], ["medium-2", "large-1"]]);
    expect(ticket.slotId).toBe("medium-2");
  });

  it("gives every ticket its own id from the injected generator", () => {
    const { parkOk } = setup();

    const first = parkOk(
      vehicle({
        plate: "M-1",
        type: MOTORCYCLE
      })
    );
    const second = parkOk(
      vehicle({
        plate: "M-2",
        type: MOTORCYCLE
      })
    );

    expect([first.id, second.id]).toEqual(["ticket-1", "ticket-2"]);
  });
});

describe("leaving and paying", () => {
  it("frees the slot so the next vehicle can use it", () => {
    const { lot, parkOk } = setup();
    const truckTicket = parkOk(
      vehicle({
        plate: "T-1",
        type: TRUCK
      })
    );

    lot.leave(truckTicket.id);

    expect(
      lot.park(
        vehicle({
          plate: "T-2",
          type: TRUCK
        })
      ).ok
    ).toBe(true);
  });

  it("a ticket works once", () => {
    const { lot, parkOk } = setup();
    const ticket = parkOk(
      vehicle({
        plate: "CAR-1",
        type: CAR
      })
    );
    lot.leave(ticket.id);

    expect(lot.leave(ticket.id)).toEqual({
      ok: false,
      reason: "unknown-ticket"
    });
  });

  it("an unknown ticket is refused", () => {
    expect(setup().lot.leave("nope")).toEqual({
      ok: false,
      reason: "unknown-ticket"
    });
  });

  it("the same plate can park again after leaving", () => {
    const { lot, parkOk } = setup();
    lot.leave(
      parkOk(
        vehicle({
          plate: "CAR-1",
          type: CAR
        })
      ).id
    );

    expect(
      lot.park(
        vehicle({
          plate: "CAR-1",
          type: CAR
        })
      ).ok
    ).toBe(true);
  });

  it.each([
    {
      minutes: 0,
      hours: 1
    },
    {
      minutes: 1,
      hours: 1
    },
    {
      minutes: 60,
      hours: 1
    },
    {
      minutes: 61,
      hours: 2
    },
    {
      minutes: 180,
      hours: 3
    }
  ])("a car parked $minutes minutes pays for $hours started hour(s)", ({ minutes, hours }) => {
    const { lot, parkOk, advanceMinutes } = setup();
    const ticket = parkOk(
      vehicle({
        plate: "CAR-1",
        type: CAR
      })
    );
    advanceMinutes(minutes);

    expect(lot.leave(ticket.id)).toEqual({
      ok: true,
      feeCents: hours * RATES.car,
      minutes
    });
  });

  it("each vehicle type pays its own rate", () => {
    const { lot, parkOk, advanceMinutes } = setup();
    const motorcycle = parkOk(
      vehicle({
        plate: "M-1",
        type: MOTORCYCLE
      })
    );
    const truck = parkOk(
      vehicle({
        plate: "T-1",
        type: TRUCK
      })
    );
    advanceMinutes(60);

    expect(lot.leave(motorcycle.id)).toMatchObject({ feeCents: 100 });
    expect(lot.leave(truck.id)).toMatchObject({ feeCents: 500 });
  });

  it("the hourly fee refuses a vehicle type it has no rate for", () => {
    const fees = createHourlyFee({ centsPerHour: RATES });

    expect(() => fees.feeCents({
      vehicle: vehicle({
        plate: "B-1",
        type: {
          name: "bus",
          size: 4
        }
      }),
      minutes: 10
    })).toThrow(/bus/);
  });

  it("if the fee cannot be worked out, the vehicle stays parked and can still leave later", () => {
    let isBroken = true;
    const flakyFees: FeePolicy = {
      feeCents() {
        if (isBroken) {
          throw new Error("pricing offline");
        }

        return 700;
      }
    };
    const { lot, parkOk } = setup({ fees: flakyFees });
    const ticket = parkOk(
      vehicle({
        plate: "CAR-1",
        type: CAR
      })
    );

    expect(() => lot.leave(ticket.id)).toThrow("pricing offline");
    expect(lot.freeSlotCount()).toBe(3);

    isBroken = false;
    expect(lot.leave(ticket.id)).toMatchObject({
      ok: true,
      feeCents: 700
    });
  });
});

describe("extension: new variants plug in without editing your code", () => {
  const BUS: VehicleType = {
    name: "bus",
    size: 4
  };
  const EXTRA_LARGE_SLOT: Slot = {
    id: "xl-1",
    size: 4
  };
  const lastCandidateChooser: SlotChooser = { choose: ({ candidates }) => candidates.at(-1) };

  it("a new vehicle type needs only data: a bus parks in the one slot big enough", () => {
    const fees = createHourlyFee({
      centsPerHour: {
        ...RATES,
        bus: 900
      }
    });
    const { lot, parkOk, advanceMinutes } = setup({
      slots: [...SLOTS, EXTRA_LARGE_SLOT],
      fees
    });

    const ticket = parkOk(
      vehicle({
        plate: "BUS-1",
        type: BUS
      })
    );
    advanceMinutes(120);

    expect(ticket.slotId).toBe("xl-1");
    expect(lot.leave(ticket.id)).toMatchObject({ feeCents: 1800 });
  });

  it("a bus is refused when the lot has no slot that size", () => {
    const fees = createHourlyFee({
      centsPerHour: {
        ...RATES,
        bus: 900
      }
    });
    const { lot } = setup({ fees });

    expect(
      lot.park(
        vehicle({
          plate: "BUS-1",
          type: BUS
        })
      )
    ).toEqual({
      ok: false,
      reason: "full"
    });
  });

  it("a new fee strategy written in the test replaces the hourly one", () => {
    const flatDayFee: FeePolicy = { feeCents: () => 1500 };
    const { lot, parkOk, advanceMinutes } = setup({ fees: flatDayFee });
    const ticket = parkOk(
      vehicle({
        plate: "CAR-1",
        type: CAR
      })
    );
    advanceMinutes(600);

    expect(lot.leave(ticket.id)).toMatchObject({ feeCents: 1500 });
  });

  it("a new fee strategy can wrap the hourly one, such as 15 free minutes", () => {
    const hourly = createHourlyFee({ centsPerHour: RATES });
    const graceFee: FeePolicy = { feeCents: input => (input.minutes <= 15 ? 0 : hourly.feeCents(input)) };
    const { lot, parkOk, advanceMinutes } = setup({ fees: graceFee });
    const quick = parkOk(
      vehicle({
        plate: "CAR-1",
        type: CAR
      })
    );
    const long = parkOk(
      vehicle({
        plate: "CAR-2",
        type: CAR
      })
    );
    advanceMinutes(10);

    expect(lot.leave(quick.id)).toMatchObject({ feeCents: 0 });
    advanceMinutes(20);
    expect(lot.leave(long.id)).toMatchObject({ feeCents: 200 });
  });

  it("a new slot strategy written in the test decides where the vehicle goes", () => {
    const { parkOk } = setup({ chooser: lastCandidateChooser });

    expect(
      parkOk(
        vehicle({
          plate: "CAR-1",
          type: CAR
        })
      ).slotId
    ).toBe("large-1");
  });

  it("new type, new fee and new chooser together, with no edit to the lot", () => {
    const scooter: VehicleType = {
      name: "scooter",
      size: 1
    };
    const cheapFee: FeePolicy = { feeCents: ({ vehicle: parked }) => (parked.type.name === "scooter" ? 50 : 300) };
    const { lot, parkOk } = setup({
      chooser: lastCandidateChooser,
      fees: cheapFee
    });

    const ticket = parkOk(
      vehicle({
        plate: "S-1",
        type: scooter
      })
    );

    expect(ticket.slotId).toBe("large-1");
    expect(lot.leave(ticket.id)).toMatchObject({ feeCents: 50 });
  });
});
