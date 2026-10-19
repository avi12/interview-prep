import type { z } from "zod";
import type { progressSchema } from "#scripts/lib/schema.ts";

type Progress = z.infer<typeof progressSchema>;

export const isPassed = ({ id, progress }: { id: string; progress: Progress }) => Boolean(progress[id]?.passedAt);

export const nextUnpassedId = ({ order, progress }: { order: readonly string[]; progress: Progress }) =>
  order.find(id => !isPassed({ id, progress }));
