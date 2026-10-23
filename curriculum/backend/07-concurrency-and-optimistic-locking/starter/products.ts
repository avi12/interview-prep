import type { PGlite } from "@electric-sql/pglite";

export type Product = {
  id: number;
  name: string;
  stock: number;
  version: number;
};
export type Changes = {
  name: string;
  stock: number;
};
export type UpdateResult =
  | {
    outcome: "updated";
    product: Product;
  }
  | {
    outcome: "conflict";
    current: Product;
  }
  | { outcome: "not_found" };

export async function findProduct({ db, id }: {
  db: PGlite;
  id: number;
}) {
  const { rows } = await db.query<Product>(`SELECT id, name, stock, version FROM products WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function updateWithVersion(_options: {
  db: PGlite;
  id: number;
  expectedVersion: number;
  changes: Changes;
}): Promise<UpdateResult> {
  return { outcome: "not_found" };
}

export async function updateWithRetry(_options: {
  db: PGlite;
  id: number;
  change: (current: Product) => Changes | Promise<Changes>;
  maxAttempts: number;
}): Promise<UpdateResult> {
  return { outcome: "not_found" };
}

export function toResponse(_result: UpdateResult) {
  return {
    status: 501,
    body: {}
  };
}
