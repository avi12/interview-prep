import type { zod } from "./zod.ts";

export async function fetchParsed<T>({
  input,
  init,
  schema
}: {
  input: RequestInfo | URL;
  init?: RequestInit;
  schema: zod.ZodType<T>;
}) {
  const response = await fetch(input, init).catch(() => null);
  if (!response?.ok) {
    return null;
  }

  const parsed = schema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data : null;
}
