import type { PGlite } from "@electric-sql/pglite";

export type Product = { id: number; name: string; stock: number; version: number };
export type Changes = { name: string; stock: number };
export type UpdateResult =
  | { outcome: "updated"; product: Product }
  | { outcome: "conflict"; current: Product }
  | { outcome: "not_found" };

const STATUS = { ok: 200, notFound: 404, conflict: 409 } as const;

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
  const { rows } = await db.query<Product>(
    `UPDATE products SET name = $3, stock = $4, version = version + 1
     WHERE id = $1 AND version = $2
     RETURNING id, name, stock, version`,
    [id, expectedVersion, changes.name, changes.stock]
  );
  if (rows[0]) return { outcome: "updated", product: rows[0] };
  const current = await findProduct({ db, id });
  if (!current) return { outcome: "not_found" };
  return { outcome: "conflict", current };
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
  const current = await findProduct({ db, id });
  if (!current) return { outcome: "not_found" };
  const result = await updateWithVersion({ db, id, expectedVersion: current.version, changes: await change(current) });
  if (result.outcome !== "conflict" || maxAttempts <= 1) return result;
  return updateWithRetry({ db, id, change, maxAttempts: maxAttempts - 1 });
}

export const toResponse = (result: UpdateResult) => {
  if (result.outcome === "updated") return { status: STATUS.ok, body: result.product };
  if (result.outcome === "conflict") {
    return { status: STATUS.conflict, body: { error: "The product changed since you read it", current: result.current } };
  }
  return { status: STATUS.notFound, body: { error: "Product not found" } };
};
