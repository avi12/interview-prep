import type { zod } from "#scripts/lib/zod.ts";

function parsedOrUndefined(text: string) {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
}

export function parseJson<Schema extends zod.ZodType>({
  text,
  schema,
  fallback
}: {
  text: string | null;
  schema: Schema;
  fallback: zod.output<Schema>;
}) {
  if (text === null) {
    return fallback;
  }

  const parsed = schema.safeParse(parsedOrUndefined(text));
  return parsed.success ? parsed.data : fallback;
}

export function parseRecords<T>({ text, schema }: { text: string; schema: zod.ZodType<T> }) {
  const records: T[] = [];
  for (const line of text.split("\n")) {
    if (line) {
      records.push(schema.parse(JSON.parse(line)));
    }
  }
  return records;
}
