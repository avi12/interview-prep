import type { PGlite } from "@electric-sql/pglite";
import { z } from "zod";

export type Post = {
  id: number;
  title: string;
  createdAt: string;
};
export type Page = {
  items: Post[];
  nextCursor: string | null;
};

const cursorSchema = z.object({
  createdAt: z.string().min(1),
  id: z.number().int()
});

export function encodeCursor({ createdAt, id }: {
  createdAt: string;
  id: number;
}) {
  return Buffer.from(
    JSON.stringify({
      createdAt,
      id
    })
  ).toString("base64url");
}

export function decodeCursor(cursor: string) {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
  } catch {
    throw new Error("Invalid cursor");
  }
}

export async function listPosts(_options: {
  db: PGlite;
  limit: number;
  cursor?: string | null;
}): Promise<Page> {
  return {
    items: [],
    nextCursor: null
  };
}
