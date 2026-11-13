import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { narrationCardsSchema } from "#scripts/lib/schema.ts";
import type { zod } from "#scripts/lib/zod.ts";

export type NarrationCards = zod.infer<typeof narrationCardsSchema>;

export function readNarrationCards({
  contentRoot,
  lessons
}: {
  contentRoot: string;
  lessons: {
    id: string;
    narration: string;
  }[];
}) {
  const cardsByLesson = new Map<string, NarrationCards>();
  for (const lesson of lessons) {
    cardsByLesson.set(
      lesson.id,
      narrationCardsSchema.parse(JSON.parse(readFileSync(resolve(contentRoot, lesson.narration), "utf8")))
    );
  }

  return cardsByLesson;
}
