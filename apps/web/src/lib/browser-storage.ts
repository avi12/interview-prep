import type { zod } from "@/lib/zod.ts";

export function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function browserSessionStorage() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function storedJson({ storage, key }: { storage: Storage | null; key: string }) {
  try {
    const text = storage?.getItem(key);
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

export function readStored<Schema extends zod.ZodType>({
  storage,
  key,
  schema,
  fallback
}: {
  storage: Storage | null;
  key: string;
  schema: Schema;
  fallback: zod.infer<Schema>;
}) {
  const parsed = schema.safeParse(
    storedJson({
      storage,
      key
    })
  );
  return parsed.success ? parsed.data : fallback;
}

export function writeStored({ storage, key, value }: { storage: Storage | null; key: string; value: unknown }) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
