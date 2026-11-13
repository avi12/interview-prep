import type { Lesson } from "#scripts/lib/lessons.ts";
import type { narrationCardsSchema } from "#scripts/lib/schema.ts";
import type { zod } from "#scripts/lib/zod.ts";

export function narrationCards(lesson: Lesson) {
  const cards: zod.infer<typeof narrationCardsSchema> = [];
  for (const [iCard, card] of lesson.cards.entries()) {
    if (card.narrate) {
      cards.push({
        card: iCard + 1,
        title: card.title,
        script: card.narrate
      });
    }
  }

  return cards;
}
