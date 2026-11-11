import type { z } from "#scripts/lib/zod.ts";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

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

const TEXT_TREE_IGNORED_NAMES = new Set(["__pycache__", ".pytest_cache", "node_modules"]);

export function readTextTree(dir: string) {
  const files: Record<string, string> = {};
  if (!existsSync(dir)) {
    return files;
  }

  for (const entry of readdirSync(dir, {
    recursive: true,
    withFileTypes: true
  })) {
    const path = resolve(entry.parentPath, entry.name);
    const segments = relative(dir, path).split(sep);
    if (!entry.isFile() || segments.some(segment => TEXT_TREE_IGNORED_NAMES.has(segment))) {
      continue;
    }

    files[segments.join("/")] = readFileSync(path, "utf8");
  }
  return files;
}
