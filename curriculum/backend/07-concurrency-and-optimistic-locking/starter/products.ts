import type { PGlite } from "@electric-sql/pglite";

export type Product = { id: number; name: string; stock: number; version: number };
export type Changes = { name: string; stock: number };
export type UpdateResult =
  | { outcome: "updated"; product: Product }
  | { outcome: "conflict"; current: Product }
  | { outcome: "not_found" };

export const findProduct = async ({ db, id }: { db: PGlite; id: number }) => {
  const { rows } = await db.query<Product>(`SELECT id, name, stock, version FROM products WHERE id = $1`, [id]);
  return rows[0] ?? null;
};

export async function updateWithVersion({
  db,
  id,
  expectedVersion,
  changes
}: {
  db: PGlite;
  id: number;
  expectedVersion: number;
  changes: Changes;
}): Promise<UpdateResult> {
  return { outcome: "not_found" };
}

export async function updateWithRetry({
  db,
  id,
  change,
  maxAttempts
}: {
  db: PGlite;
  id: number;
  change: (current: Product) => Changes | Promise<Changes>;
  maxAttempts: number;
}): Promise<UpdateResult> {
  return { outcome: "not_found" };
}

export const toResponse = (result: UpdateResult) => ({ status: 501, body: {} });
