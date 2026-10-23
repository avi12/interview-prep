import type { Changes, Product, UpdateResult } from "../starter/products.ts";
import type { PGlite } from "@electric-sql/pglite";
import { openDb } from "#kit/db.ts";
import { loadImpl } from "#kit/impl.ts";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it
} from "vitest";
import { z } from "zod";

type Module = {
  updateWithVersion: (input: {
    db: PGlite;
    id: number;
    expectedVersion: number;
    changes: Changes;
  }) => Promise<UpdateResult>;
  updateWithRetry: (input: {
    db: PGlite;
    id: number;
    change: (current: Product) => Changes | Promise<Changes>;
    maxAttempts: number;
  }) => Promise<UpdateResult>;
  toResponse: (result: UpdateResult) => {
    status: number;
    body: unknown;
  };
};

const { updateWithVersion, updateWithRetry, toResponse } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "products.ts"
});

const conflictBodySchema = z.looseObject({
  current: z.unknown().optional(),
  error: z.unknown().optional()
});

const SEED = `
  CREATE TABLE products (id int PRIMARY KEY, name text NOT NULL, stock int NOT NULL, version int NOT NULL DEFAULT 1);
  INSERT INTO products VALUES (1, 'Keyboard', 10, 1), (2, 'Mouse', 5, 1);`;

async function readRow({ db, id }: {
  db: PGlite;
  id: number;
}) {
  return (await db.query<Product>(`SELECT id, name, stock, version FROM products WHERE id = $1`, [id])).rows[0];
}

function rivalSale(db: PGlite) {
  return db.query(`UPDATE products SET stock = stock - 1, version = version + 1 WHERE id = 1`);
}

function sellOne(current: Product): Changes {
  return {
    name: current.name,
    stock: current.stock - 1
  };
}

let db: PGlite;

beforeAll(async () => {
  db = await openDb(SEED);
});
beforeEach(() => db.exec("BEGIN"));
afterEach(() => db.exec("ROLLBACK"));

describe("the lost update you are preventing", () => {
  it("read, change, write: two sellers each read 10, each write 9, and one sale vanishes", async () => {
    const sellerA = await readRow({
      db,
      id: 1
    });
    const sellerB = await readRow({
      db,
      id: 1
    });
    await db.query(`UPDATE products SET stock = $1 WHERE id = 1`, [sellerA.stock - 1]);
    await db.query(`UPDATE products SET stock = $1 WHERE id = 1`, [sellerB.stock - 1]);
    expect(
      (await readRow({
        db,
        id: 1
      })).stock
    ).toBe(9);
  });
});

describe("updateWithVersion", () => {
  it("applies the change and bumps the version by one when the version matches", async () => {
    const result = await updateWithVersion({
      db,
      id: 1,
      expectedVersion: 1,
      changes: {
        name: "Keyboard Pro",
        stock: 8
      }
    });
    expect(result).toEqual({
      outcome: "updated",
      product: {
        id: 1,
        name: "Keyboard Pro",
        stock: 8,
        version: 2
      }
    });
    expect(
      await readRow({
        db,
        id: 1
      })
    ).toEqual({
      id: 1,
      name: "Keyboard Pro",
      stock: 8,
      version: 2
    });
  });

  it("refuses a stale version: the second writer gets a conflict and the first writer's data survives", async () => {
    await updateWithVersion({
      db,
      id: 1,
      expectedVersion: 1,
      changes: {
        name: "Keyboard",
        stock: 9
      }
    });
    const late = await updateWithVersion({
      db,
      id: 1,
      expectedVersion: 1,
      changes: {
        name: "Keyboard",
        stock: 9
      }
    });
    expect(late.outcome).toBe("conflict");
    expect(
      await readRow({
        db,
        id: 1
      })
    ).toMatchObject({
      stock: 9,
      version: 2
    });
  });

  it("a conflict carries the current row, so the client can re-read and decide", async () => {
    await updateWithVersion({
      db,
      id: 1,
      expectedVersion: 1,
      changes: {
        name: "Renamed",
        stock: 3
      }
    });
    const late = await updateWithVersion({
      db,
      id: 1,
      expectedVersion: 1,
      changes: {
        name: "Mine",
        stock: 7
      }
    });
    expect(late).toEqual({
      outcome: "conflict",
      current: {
        id: 1,
        name: "Renamed",
        stock: 3,
        version: 2
      }
    });
  });

  it("a conflict changes nothing, not even the version", async () => {
    await db.query(`UPDATE products SET version = 4 WHERE id = 1`);
    await updateWithVersion({
      db,
      id: 1,
      expectedVersion: 2,
      changes: {
        name: "Nope",
        stock: 0
      }
    });
    expect(
      await readRow({
        db,
        id: 1
      })
    ).toEqual({
      id: 1,
      name: "Keyboard",
      stock: 10,
      version: 4
    });
  });

  it("a version from the future is a conflict too", async () => {
    const result = await updateWithVersion({
      db,
      id: 1,
      expectedVersion: 99,
      changes: {
        name: "Nope",
        stock: 0
      }
    });
    expect(result.outcome).toBe("conflict");
  });

  it("after a conflict, retrying with the version from the conflict succeeds", async () => {
    await updateWithVersion({
      db,
      id: 1,
      expectedVersion: 1,
      changes: {
        name: "Keyboard",
        stock: 9
      }
    });
    const late = await updateWithVersion({
      db,
      id: 1,
      expectedVersion: 1,
      changes: {
        name: "Keyboard",
        stock: 8
      }
    });
    if (late.outcome !== "conflict") {
      throw new Error("expected a conflict");
    }

    const retry = await updateWithVersion({
      db,
      id: 1,
      expectedVersion: late.current.version,
      changes: {
        name: "Keyboard",
        stock: 8
      }
    });
    expect(retry).toMatchObject({
      outcome: "updated",
      product: {
        stock: 8,
        version: 3
      }
    });
  });

  it("a missing product is not_found, not a conflict", async () => {
    expect(
      await updateWithVersion({
        db,
        id: 999,
        expectedVersion: 1,
        changes: {
          name: "Ghost",
          stock: 1
        }
      })
    ).toEqual({ outcome: "not_found" });
  });

  it("only touches the product it was asked to", async () => {
    await updateWithVersion({
      db,
      id: 1,
      expectedVersion: 1,
      changes: {
        name: "Changed",
        stock: 0
      }
    });
    expect(
      await readRow({
        db,
        id: 2
      })
    ).toEqual({
      id: 2,
      name: "Mouse",
      stock: 5,
      version: 1
    });
  });
});

describe("updateWithRetry", () => {
  it("with no rival, reads once, applies the change and returns the updated product", async () => {
    let calls = 0;
    const result = await updateWithRetry({
      db,
      id: 1,
      maxAttempts: 3,
      change(current) {
        calls += 1;
        return sellOne(current);
      }
    });
    expect(result).toMatchObject({
      outcome: "updated",
      product: {
        stock: 9,
        version: 2
      }
    });
    expect(calls).toBe(1);
  });

  it("when a rival writes in between, it re-reads and applies the change on top of the rival's, so no sale is lost", async () => {
    let calls = 0;
    const result = await updateWithRetry({
      db,
      id: 1,
      maxAttempts: 3,
      async change(current) {
        calls += 1;

        if (calls === 1) {
          await rivalSale(db);
        }

        return sellOne(current);
      }
    });
    expect(result).toMatchObject({
      outcome: "updated",
      product: {
        stock: 8,
        version: 3
      }
    });
    expect(calls).toBe(2);
  });

  it("gives up with a conflict after maxAttempts and calls change exactly that many times", async () => {
    let calls = 0;
    const result = await updateWithRetry({
      db,
      id: 1,
      maxAttempts: 3,
      async change(current) {
        calls += 1;
        await rivalSale(db);
        return sellOne(current);
      }
    });
    expect(result.outcome).toBe("conflict");
    expect(calls).toBe(3);
  });

  it("with one attempt allowed, a single conflict is returned straight away", async () => {
    let calls = 0;
    const result = await updateWithRetry({
      db,
      id: 1,
      maxAttempts: 1,
      async change(current) {
        calls += 1;
        await rivalSale(db);
        return sellOne(current);
      }
    });
    expect(result.outcome).toBe("conflict");
    expect(calls).toBe(1);
  });

  it("a missing product is not_found and change is never called", async () => {
    let calls = 0;
    const result = await updateWithRetry({
      db,
      id: 999,
      maxAttempts: 3,
      change(current) {
        calls += 1;
        return sellOne(current);
      }
    });
    expect(result).toEqual({ outcome: "not_found" });
    expect(calls).toBe(0);
  });

  it("five sellers at once: every sale is counted", async () => {
    const sellers = Array.from({ length: 5 }, () => updateWithRetry({
      db,
      id: 1,
      maxAttempts: 10,
      change: sellOne
    }));
    const results = await Promise.all(sellers);
    expect(results.every(result => result.outcome === "updated")).toBe(true);
    expect(
      await readRow({
        db,
        id: 1
      })
    ).toMatchObject({
      stock: 5,
      version: 6
    });
  });
});

describe("toResponse", () => {
  const product = {
    id: 1,
    name: "Keyboard",
    stock: 10,
    version: 2
  };

  it("maps an update to 200 with the new product", () => {
    expect(
      toResponse({
        outcome: "updated",
        product
      })
    ).toEqual({
      status: 200,
      body: product
    });
  });

  it("maps a conflict to 409 and includes the current version of the product", () => {
    const response = toResponse({
      outcome: "conflict",
      current: product
    });
    expect(response.status).toBe(409);
    const body = conflictBodySchema.parse(response.body);
    expect(body.current).toEqual(product);
    expect(typeof body.error).toBe("string");
  });

  it("maps not_found to 404", () => {
    expect(toResponse({ outcome: "not_found" }).status).toBe(404);
  });
});
