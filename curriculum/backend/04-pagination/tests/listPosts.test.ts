import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { openDb } from "#kit/db.ts";
import type { Page, Post } from "../starter/listPosts.ts";

type Module = { listPosts: (input: { db: PGlite; limit: number; cursor?: string | null }) => Promise<Page> };

const { listPosts } = await loadImpl<Module>({ testUrl: import.meta.url, file: "listPosts.ts" });

const MAX_PAGES = 50;
const WALK_LIMIT = 2;
const INJECTION_TIMESTAMP = "2100-01-01', 1) OR true OR (created_at, id) < ('2100-01-01";

const encodeRawCursor = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

const withRowCounter = (db: PGlite) => {
  const counter = { maxRows: 0 };
  const wrapped = new Proxy(db, {
    get(target, property) {
      if (property === "query") {
        return async (...args: Parameters<PGlite["query"]>) => {
          const result = await target.query(...args);
          counter.maxRows = Math.max(counter.maxRows, result.rows.length);
          return result;
        };
      }
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
  return { wrapped, counter };
};

const SCHEMA = `
  CREATE TABLE posts (id int PRIMARY KEY, title text NOT NULL, created_at timestamptz NOT NULL);
  CREATE INDEX posts_newest ON posts (created_at DESC, id DESC);`;

const seedFrom = (rows: Array<[number, string]>) =>
  `${SCHEMA} INSERT INTO posts VALUES ${rows.map(([id, at]) => `(${id}, 'post ${id}', '${at}')`).join(", ")};`;

const DAILY_TIES = seedFrom(
  Array.from({ length: 12 }, (_, i): [number, string] => [i + 1, `2024-01-0${Math.floor(i / 4) + 1} 10:00:00+00`])
);
const ALL_TIED = seedFrom(Array.from({ length: 7 }, (_, i): [number, string] => [i + 1, "2024-05-05 08:00:00+00"]));
const MICROSECONDS = seedFrom([
  [1, "2024-02-01 09:00:00.123456+00"],
  [2, "2024-02-01 09:00:00.123789+00"],
  [3, "2024-02-01 09:00:00.123999+00"],
  [4, "2024-02-01 09:00:00.124000+00"],
  [5, "2024-02-01 09:00:00.123100+00"]
]);

const insertPost = ({ db, id, createdAt }: { db: PGlite; id: number; createdAt: string }) =>
  db.query(`INSERT INTO posts VALUES ($1, $2, $3)`, [id, `post ${id}`, createdAt]);

const truthOrder = async (db: PGlite) => {
  const { rows } = await db.query<{ id: number }>(`SELECT id FROM posts ORDER BY created_at DESC, id DESC`);
  return rows.map(row => row.id);
};

const walk = async ({ db, limit }: { db: PGlite; limit: number }) => {
  const pages: Page[] = [];
  let cursor: string | null = null;
  do {
    if (pages.length >= MAX_PAGES) throw new Error(`still getting cursors after ${MAX_PAGES} pages`);
    const page: Page = await listPosts({ db, limit, cursor });
    pages.push(page);
    cursor = page.nextCursor;
  } while (cursor);
  return pages;
};

const idsOf = (pages: Page[]) => pages.flatMap(page => page.items.map(item => item.id));

describe("why not OFFSET: the drift you are avoiding", () => {
  it("a new row inserted between two OFFSET pages makes the second page repeat a row", async () => {
    const db = await openDb(DAILY_TIES);
    const offsetPage = async (offset: number) =>
      (await db.query<{ id: number }>(`SELECT id FROM posts ORDER BY created_at DESC, id DESC LIMIT 3 OFFSET $1`, [offset])).rows.map(row => row.id);
    const first = await offsetPage(0);
    await insertPost({ db, id: 13, createdAt: "2024-02-01 10:00:00+00" });
    const second = await offsetPage(3);
    expect(first.filter(id => second.includes(id))).toHaveLength(1);
  });
});

describe.each([
  { name: "twelve posts, four per day", seed: DAILY_TIES },
  { name: "seven posts at the exact same instant", seed: ALL_TIED },
  { name: "posts that differ only in microseconds", seed: MICROSECONDS }
])("listPosts on $name", ({ seed }) => {
  let db: PGlite;
  beforeAll(async () => {
    db = await openDb(seed);
  });
  beforeEach(() => db.exec("BEGIN"));
  afterEach(() => db.exec("ROLLBACK"));

  it("the first page is the newest posts, at most `limit` of them, and says there is more", async () => {
    const expected = await truthOrder(db);
    const page = await listPosts({ db, limit: 3 });
    expect(page.items.map(item => item.id)).toEqual(expected.slice(0, 3));
    expect(page.nextCursor).toEqual(expect.any(String));
  });

  it.each([1, 2, 3, 4, 100])("walking with limit %i returns every post exactly once, newest first", async limit => {
    const expected = await truthOrder(db);
    const ids = idsOf(await walk({ db, limit }));
    expect(ids).toEqual(expected);
  });

  it("the last page has no cursor, and there is no empty page after an exact fit", async () => {
    const total = (await truthOrder(db)).length;
    const limit = total;
    const pages = await walk({ db, limit });
    expect(pages).toHaveLength(1);
    expect(pages[0].nextCursor).toBeNull();
    const smaller = await walk({ db, limit: 1 });
    expect(smaller).toHaveLength(total);
    expect(smaller.at(-1)?.nextCursor).toBeNull();
  });

  it("new posts arriving between pages do not shift or repeat anything", async () => {
    const original = await truthOrder(db);
    const first = await listPosts({ db, limit: 2 });
    await insertPost({ db, id: 901, createdAt: "2030-01-01 00:00:00+00" });
    await insertPost({ db, id: 902, createdAt: "2030-01-02 00:00:00+00" });
    await insertPost({ db, id: 903, createdAt: "2030-01-03 00:00:00+00" });
    const rest = await walkFrom({ db, limit: 2, cursor: first.nextCursor });
    expect([...first.items.map(item => item.id), ...rest]).toEqual(original);
  });

  it("deleting the row the cursor points at does not break the next page", async () => {
    const original = await truthOrder(db);
    const first = await listPosts({ db, limit: 2 });
    const last = first.items.at(-1) as Post;
    await db.query(`DELETE FROM posts WHERE id = $1`, [last.id]);
    const rest = await walkFrom({ db, limit: 2, cursor: first.nextCursor });
    expect(rest).toEqual(original.slice(2));
  });

  it("an older post added after page one still shows up later (keyset does not skip what belongs ahead)", async () => {
    const first = await listPosts({ db, limit: 2 });
    await insertPost({ db, id: 950, createdAt: "2001-01-01 00:00:00+00" });
    const rest = await walkFrom({ db, limit: 2, cursor: first.nextCursor });
    expect(rest.at(-1)).toBe(950);
  });

  it("asks the database for one page at a time: never more than limit + 1 rows come back per query", async () => {
    const { wrapped, counter } = withRowCounter(db);
    await walk({ db: wrapped, limit: WALK_LIMIT });
    expect(counter.maxRows).toBeGreaterThan(0);
    expect(counter.maxRows).toBeLessThanOrEqual(WALK_LIMIT + 1);
  });

  it("returns the created time as text, not a Date, so the cursor keeps full precision", async () => {
    const { items } = await listPosts({ db, limit: 1 });
    expect(typeof items[0].createdAt).toBe("string");
  });
});

describe("listPosts edge cases", () => {
  it("an empty table gives an empty page and no cursor", async () => {
    const db = await openDb(SCHEMA);
    expect(await listPosts({ db, limit: 5 })).toEqual({ items: [], nextCursor: null });
  });

  it("a cursor carrying SQL is rejected, not run", async () => {
    const db = await openDb(DAILY_TIES);
    const cursor = encodeRawCursor({ createdAt: INJECTION_TIMESTAMP, id: 1 });
    await expect(listPosts({ db, limit: 3, cursor })).rejects.toThrow();
    expect((await db.query(`SELECT count(*)::int AS total FROM posts`)).rows).toEqual([{ total: 12 }]);
  });

  it("a cursor with the wrong shape is rejected", async () => {
    const db = await openDb(DAILY_TIES);
    for (const value of [{}, { createdAt: "2024-01-01 10:00:00+00" }, { createdAt: 5, id: 1 }, { createdAt: "2024-01-01 10:00:00+00", id: "1" }, null]) {
      await expect(listPosts({ db, limit: 3, cursor: encodeRawCursor(value) })).rejects.toThrow();
    }
  });

  it("a cursor that was not made by this API is rejected", async () => {
    const db = await openDb(DAILY_TIES);
    await expect(listPosts({ db, limit: 3, cursor: "not-a-real-cursor" })).rejects.toThrow(/cursor/i);
  });
});

async function walkFrom({ db, limit, cursor }: { db: PGlite; limit: number; cursor: string | null }) {
  const ids: number[] = [];
  let next = cursor;
  let pageCount = 0;
  while (next) {
    if (++pageCount > MAX_PAGES) throw new Error(`still getting cursors after ${MAX_PAGES} pages`);
    const page: Page = await listPosts({ db, limit, cursor: next });
    ids.push(...page.items.map(item => item.id));
    next = page.nextCursor;
  }
  return ids;
}
