import type { PGlite } from "@electric-sql/pglite";

type TransferInput = { db: PGlite; fromId: number; toId: number; amountCents: number };

export async function transfer({ db, fromId, toId, amountCents }: TransferInput) {
  await db.query("UPDATE accounts SET balance_cents = balance_cents + $1 WHERE id = $2", [amountCents, toId]);
  await db.query("UPDATE accounts SET balance_cents = balance_cents - $1 WHERE id = $2", [amountCents, fromId]);
}
