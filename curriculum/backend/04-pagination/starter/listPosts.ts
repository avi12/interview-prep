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

export async function listPosts({ db, limit, cursor }: { db: PGlite; limit: number; cursor?: string | null }): Promise<Page> {
  return { items: [], nextCursor: null };
}
