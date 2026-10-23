import type { PGlite } from "@electric-sql/pglite";
import { z } from "zod";

export type Post = { id: number; title: string; createdAt: string };
export type Page = { items: Post[]; nextCursor: string | null };

const cursorSchema = z.object({ createdAt: z.string().min(1), id: z.number().int() });

export const encodeCursor = ({ createdAt, id }: { createdAt: string; id: number }) =>
  Buffer.from(JSON.stringify({ createdAt, id })).toString("base64url");

export const decodeCursor = (cursor: string) => {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
  } catch {
    throw new Error("Invalid cursor");
  }
};

const SELECT_POSTS = `SELECT id, title, created_at::text AS "createdAt" FROM posts`;
const NEWEST_FIRST = `ORDER BY created_at DESC, id DESC`;
const FIRST_PAGE_QUERY = `${SELECT_POSTS} ${NEWEST_FIRST} LIMIT $1`;
const NEXT_PAGE_QUERY = `${SELECT_POSTS} WHERE (created_at, id) < ($1::timestamptz, $2::int) ${NEWEST_FIRST} LIMIT $3`;

const fetchRows = async ({ db, limit, cursor }: { db: PGlite; limit: number; cursor?: string | null }) => {
  const fetchSize = limit + 1;
  if (!cursor) return db.query<Post>(FIRST_PAGE_QUERY, [fetchSize]);
  const { createdAt, id } = decodeCursor(cursor);
  return db.query<Post>(NEXT_PAGE_QUERY, [createdAt, id, fetchSize]);
};

export async function listPosts({ db, limit, cursor }: { db: PGlite; limit: number; cursor?: string | null }): Promise<Page> {
  const { rows } = await fetchRows({ db, limit, cursor });
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  const hasMore = rows.length > limit;
  return { items, nextCursor: hasMore && last ? encodeCursor(last) : null };
}
