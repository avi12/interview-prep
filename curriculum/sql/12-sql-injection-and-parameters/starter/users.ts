import type { PGlite } from "@electric-sql/pglite";

type User = { id: number; username: string; role: string };

export async function findUser({ db, username }: { db: PGlite; username: string }) {
  const { rows } = await db.query<User>(`SELECT id, username, role FROM users WHERE username = '${username}'`);
  return rows[0] ?? null;
}

export async function listUsers({ db, sortBy }: { db: PGlite; sortBy: string }) {
  const { rows } = await db.query<User>(`SELECT id, username, role FROM users ORDER BY ${sortBy}`);
  return rows;
}
