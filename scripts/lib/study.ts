import type { progressSchema, tracksSchema } from "#scripts/lib/schema.ts";
import type { z } from "#scripts/lib/zod.ts";

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

export function groupByTrack<Lesson extends { track: string }>({ tracks, lessons }: {
  tracks: z.infer<typeof tracksSchema>;
  lessons: readonly Lesson[];
}) {
  return tracks
    .map(track => ({
      track,
      lessons: lessons.filter(lesson => lesson.track === track.id)
    }))
    .filter(group => group.lessons.length > 0);
}
