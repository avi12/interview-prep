import { describe, expect, it } from "vitest";
import { openDb, runQueryFile } from "#kit/db.ts";

const SCHEMA = `CREATE TABLE contacts (id int PRIMARY KEY, email text NOT NULL, name text NOT NULL, created_at timestamp NOT NULL);`;

const NEWSLETTER = `${SCHEMA}
INSERT INTO contacts VALUES
  (1, 'dana@x.com', 'Dana', '2025-01-01 10:00'),
  (2, 'Dana@X.com', 'Dana L.', '2025-01-05 10:00'),
  (3, 'omer@x.com', 'Omer', '2025-01-02 10:00'),
  (4, 'noa@x.com', 'Noa', '2025-01-03 10:00'),
  (5, 'noa@x.com', 'Noa K.', '2025-01-03 10:00'),
  (6, 'noa@x.com', 'N.', '2024-12-30 10:00');`;

const OLD_IDS_WIN = `${SCHEMA}
INSERT INTO contacts VALUES
  (1, 'a@x.com', 'A', '2025-03-01 08:00'),
  (2, 'a@x.com', 'A old', '2025-02-01 08:00'),
  (3, 'b@x.com', 'B', '2025-03-04 08:00'),
  (4, 'b@x.com', 'B new', '2025-03-05 08:00'),
  (5, 'C@x.com', 'C', '2025-03-06 08:00');`;

const run = async (seed: string) => {
  const db = await openDb(seed);
  const { rows, columns } = await runQueryFile({ db, testUrl: import.meta.url, file: "dedupe.sql" });
  const remaining = await db.query<{ id: number }>("SELECT id FROM contacts ORDER BY id");
  return {
    columns,
    deletedIds: rows.map(row => Number(row.id)).sort((a, b) => a - b),
    remainingIds: remaining.rows.map(row => row.id)
  };
};

describe("remove duplicate contacts, keep the newest", () => {
  it("returns the deleted ids (RETURNING id)", async () => {
    const { columns } = await run(NEWSLETTER);
    expect(columns).toEqual(["id"]);
  });

  it("deletes older copies, ignores letter case, breaks a tie with the highest id", async () => {
    const { deletedIds, remainingIds } = await run(NEWSLETTER);
    expect(deletedIds).toEqual([1, 4, 6]);
    expect(remainingIds).toEqual([2, 3, 5]);
  });

  it("decides by created_at, not by id, and leaves unique rows alone (no hardcoding)", async () => {
    const { deletedIds, remainingIds } = await run(OLD_IDS_WIN);
    expect(deletedIds).toEqual([2, 3]);
    expect(remainingIds).toEqual([1, 4, 5]);
  });
});
