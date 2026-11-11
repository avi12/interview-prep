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

export type TrackProgress = {
  total: number;
  passed: number;
  inProgress: number;
};

export function progressOfLessons({ lessons, progress }: {
  lessons: readonly { id: string }[];
  progress: Progress;
}): TrackProgress {
  let passed = 0;
  let inProgress = 0;
  for (const { id } of lessons) {
    if (isPassed({
      id,
      progress
    })) {
      passed++;
      continue;
    }

    if ((progress[id]?.attempts ?? 0) > 0) {
      inProgress++;
    }
  }
  return {
    total: lessons.length,
    passed,
    inProgress
  };
}

export function progressByTrack({ tracks, lessons, progress }: {
  tracks: z.infer<typeof tracksSchema>;
  lessons: readonly {
    id: string;
    track: string;
  }[];
  progress: Progress;
}) {
  const byTrack: Record<string, TrackProgress> = {};
  for (const { track, lessons: trackLessons } of groupByTrack({
    tracks,
    lessons
  })) {
    byTrack[track.id] = progressOfLessons({
      lessons: trackLessons,
      progress
    });
  }
  return byTrack;
}

export function describeProgress({ total, passed, inProgress }: TrackProgress) {
  const parts = [`${passed} of ${total} done`];
  if (inProgress > 0) {
    parts.push(`${inProgress} in progress`);
  }

  return parts.join(", ");
}
