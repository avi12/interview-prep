import type { z } from "#scripts/lib/zod.ts";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function ensureParentDir(path: string) {
  return mkdirSync(dirname(path), { recursive: true });
}

export function writeFileDeep({ path, content }: {
  path: string;
  content: string;
}) {
  ensureParentDir(path);
  writeFileSync(path, content);
}

export function readJsonFile<Schema extends z.ZodType>({
  path,
  schema,
  fallback
}: {
  path: string;
  schema: Schema;
  fallback?: z.output<Schema>;
}) {
  const hasFallback = fallback !== undefined;
  if (!existsSync(path) && hasFallback) {
    return fallback;
  }

  const parsed = schema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (parsed.success) {
    return parsed.data;
  }

  if (hasFallback) {
    return fallback;
  }

  throw parsed.error;
}
