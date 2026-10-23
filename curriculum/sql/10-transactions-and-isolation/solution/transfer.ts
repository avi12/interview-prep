import type { PGlite } from "@electric-sql/pglite";

type TransferInput = {
  db: PGlite;
  fromId: number;
  toId: number;
  amountCents: number;
};

const NO_ROWS = 0;
const DEBIT_SQL = "UPDATE accounts SET balance_cents = balance_cents - $1 WHERE id = $2 AND balance_cents >= $1";
const CREDIT_SQL = "UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2";

export async function transfer({ db, fromId, toId, amountCents }: TransferInput) {
  if (amountCents <= 0) {
    throw new Error("amount must be above zero");
  }

  await db.transaction(async transaction => {
    const debit = await transaction.query(DEBIT_SQL, [amountCents, fromId]);
    if (debit.affectedRows === NO_ROWS) {
      throw new Error("sender not found or insufficient funds");
    }

    const credit = await transaction.query(CREDIT_SQL, [amountCents, toId]);
    if (credit.affectedRows === NO_ROWS) {
      throw new Error("recipient not found");
    }
  });
}
