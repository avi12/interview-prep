import type { PGlite } from "@electric-sql/pglite";
import { openDb } from "#kit/db.ts";
import { loadImpl } from "#kit/impl.ts";
import { beforeEach, describe, expect, it } from "vitest";

type TransferInput = {
  db: PGlite;
  fromId: number;
  toId: number;
  amountCents: number;
};
type Module = { transfer: (input: TransferInput) => Promise<unknown> };

const { transfer } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "transfer.ts"
});

const SEED = `
CREATE TABLE accounts (id int PRIMARY KEY, owner text NOT NULL, balance_cents int NOT NULL CHECK (balance_cents >= 0));
INSERT INTO accounts VALUES (1, 'Dana', 10000), (2, 'Omer', 2500), (3, 'Noa', 0);`;

const DANA = 1;
const OMER = 2;
const NOA = 3;
const UNKNOWN = 99;
const START = {
  [DANA]: 10000,
  [OMER]: 2500,
  [NOA]: 0
};
const TOTAL_CENTS = 12500;

let db: PGlite;

beforeEach(async () => {
  db = await openDb(SEED);
});

async function balances() {
  const { rows } = await db.query<{
    id: number;
    balance_cents: number;
  }>("SELECT id, balance_cents FROM accounts ORDER BY id");
  return Object.fromEntries(rows.map(row => [row.id, row.balance_cents]));
}

describe("transfer between accounts", () => {
  it("moves the amount from the sender to the recipient", async () => {
    await transfer({
      db,
      fromId: DANA,
      toId: OMER,
      amountCents: 3000
    });
    expect(await balances()).toEqual({
      [DANA]: 7000,
      [OMER]: 5500,
      [NOA]: 0
    });
  });

  it("allows sending the whole balance", async () => {
    await transfer({
      db,
      fromId: OMER,
      toId: NOA,
      amountCents: 2500
    });
    expect(await balances()).toEqual({
      [DANA]: 10000,
      [OMER]: 0,
      [NOA]: 2500
    });
  });

  it("throws on insufficient funds and leaves both balances unchanged", async () => {
    await expect(
      transfer({
        db,
        fromId: OMER,
        toId: DANA,
        amountCents: 2501
      })
    ).rejects.toThrow();
    expect(await balances()).toEqual(START);
  });

  it("rolls the debit back when the recipient does not exist", async () => {
    await expect(
      transfer({
        db,
        fromId: DANA,
        toId: UNKNOWN,
        amountCents: 1000
      })
    ).rejects.toThrow();
    expect(await balances()).toEqual(START);
  });

  it("throws when the sender does not exist and creates no money", async () => {
    await expect(
      transfer({
        db,
        fromId: UNKNOWN,
        toId: OMER,
        amountCents: 1000
      })
    ).rejects.toThrow();
    expect(await balances()).toEqual(START);
  });

  it("rejects an amount of zero or less (a negative transfer would steal money)", async () => {
    await expect(
      transfer({
        db,
        fromId: DANA,
        toId: OMER,
        amountCents: 0
      })
    ).rejects.toThrow();
    await expect(
      transfer({
        db,
        fromId: DANA,
        toId: OMER,
        amountCents: -500
      })
    ).rejects.toThrow();
    expect(await balances()).toEqual(START);
  });

  it("does not overdraw the sender when two transfers start at the same time", async () => {
    const results = await Promise.allSettled([
      transfer({
        db,
        fromId: DANA,
        toId: OMER,
        amountCents: 6000
      }),
      transfer({
        db,
        fromId: DANA,
        toId: NOA,
        amountCents: 6000
      })
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const after = await balances();
    expect(after[DANA]).toBe(4000);
    expect(after[OMER] + after[NOA]).toBe(2500 + 6000);
  });

  it("keeps the total money constant over a mix of good and failing transfers, and keeps working after a failure", async () => {
    const attempts = [
      {
        fromId: DANA,
        toId: OMER,
        amountCents: 4000
      },
      {
        fromId: NOA,
        toId: DANA,
        amountCents: 100
      },
      {
        fromId: OMER,
        toId: UNKNOWN,
        amountCents: 500
      },
      {
        fromId: OMER,
        toId: NOA,
        amountCents: 6500
      },
      {
        fromId: DANA,
        toId: NOA,
        amountCents: 6000
      }
    ];
    for (const attempt of attempts) {
      await transfer({
        db,
        ...attempt
      }).catch(() => undefined);
    }
    const after = await balances();
    expect(after[DANA] + after[OMER] + after[NOA]).toBe(TOTAL_CENTS);
    expect(after).toEqual({
      [DANA]: 0,
      [OMER]: 0,
      [NOA]: TOTAL_CENTS
    });
  });
});
