import type { PGlite } from "@electric-sql/pglite";
import { openDb } from "#kit/db.ts";
import { loadImpl } from "#kit/impl.ts";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

type User = {
  id: number;
  username: string;
  role: string;
};
type Module = {
  findUser: (input: {
    db: PGlite;
    username: string;
  }) => Promise<User | null>;
  listUsers: (input: {
    db: PGlite;
    sortBy: string;
  }) => Promise<User[]>;
};

const { findUser, listUsers } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "users.ts"
});

const SEED = `
CREATE TABLE users (id int PRIMARY KEY, username text NOT NULL UNIQUE, role text NOT NULL, password_hash text NOT NULL);
INSERT INTO users VALUES
  (1, 'admin', 'admin', 'hash-of-admin-secret'),
  (2, 'dana', 'member', 'hash-of-dana'),
  (3, 'omer', 'member', 'hash-of-omer'),
  (4, 'O''Brien', 'member', 'hash-of-obrien');`;

const USER_COUNT = 4;

const LOGIN_PAYLOADS = [
  "' OR '1'='1",
  "' OR 1=1 --",
  "admin' --",
  "x' UNION SELECT id, password_hash, role FROM users WHERE role = 'admin' --",
  "x'; DROP TABLE users; --"
];

const SORT_PAYLOADS = ["password_hash", "constructor", "(SELECT 1)", "username; DROP TABLE users", "id DESC, password_hash", "1"];

let db: PGlite;

beforeEach(async () => {
  db = await openDb(SEED);
});

function withQueryLog(target: PGlite) {
  const querySpy = vi.spyOn(target, "query");
  return {
    watchedDb: target,
    sentTexts: () => querySpy.mock.calls.map(([text]) => text)
  };
}

async function userCount() {
  const { rows } = await db.query<{ total: number }>("SELECT COUNT(*)::int AS total FROM users");
  return rows[0].total;
}

async function idsSortedBy(column: string) {
  const { rows } = await db.query<{ id: number }>(`SELECT id FROM users ORDER BY ${column}, id`);
  return rows.map(row => row.id);
}

describe("findUser", () => {
  it("finds a user by exact username", async () => {
    expect(
      await findUser({
        db,
        username: "dana"
      })
    ).toEqual({
      id: 2,
      username: "dana",
      role: "member"
    });
  });

  it("returns null when nobody has that name", async () => {
    expect(
      await findUser({
        db,
        username: "nobody"
      })
    ).toBeNull();
  });

  it("finds a real name that contains a quote (O'Brien)", async () => {
    expect(
      await findUser({
        db,
        username: "O'Brien"
      })
    ).toEqual({
      id: 4,
      username: "O'Brien",
      role: "member"
    });
  });

  it("sends the name as a parameter, never pasted or hand-escaped inside the query text", async () => {
    const { watchedDb, sentTexts } = withQueryLog(db);
    expect(
      await findUser({
        db: watchedDb,
        username: "dana"
      })
    ).not.toBeNull();
    expect(sentTexts().filter(text => text.includes("dana"))).toEqual([]);
  });

  it.each(LOGIN_PAYLOADS)("treats the payload %s as a plain name and finds nobody", async payload => {
    expect(
      await findUser({
        db,
        username: payload
      })
    ).toBeNull();
    expect(await userCount()).toBe(USER_COUNT);
  });
});

describe("listUsers", () => {
  it.each(["id", "username"])("sorts by %s", async column => {
    const users = await listUsers({
      db,
      sortBy: column
    });
    expect(users.map(user => user.id)).toEqual(await idsSortedBy(column));
  });

  it("returns only id, username and role (never the password hash)", async () => {
    const [first] = await listUsers({
      db,
      sortBy: "id"
    });
    expect(Object.keys(first).sort()).toEqual(["id", "role", "username"]);
  });

  it.each(SORT_PAYLOADS)("refuses to sort by %s before any SQL is sent", async payload => {
    const { watchedDb, sentTexts } = withQueryLog(db);
    await expect(
      listUsers({
        db: watchedDb,
        sortBy: payload
      })
    ).rejects.toThrow();
    expect(sentTexts()).toEqual([]);
    expect(await userCount()).toBe(USER_COUNT);
  });
});
