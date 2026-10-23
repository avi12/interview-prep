import type { progressSchema } from "#scripts/lib/schema.ts";
import type { z } from "zod";

type Progress = z.infer<typeof progressSchema>;

export function isPassed({ id, progress }: {
  id: string;
  progress: Progress;
}) {
  return Boolean(progress[id]?.passedAt);
}

export function nextUnpassedId({ order, progress }: {
  order: readonly string[];
  progress: Progress;
}) {
  return order.find(id => !isPassed({
    id,
    progress
  }));
}
