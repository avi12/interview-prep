import { ALL_ROLES } from "#scripts/lib/path.ts";
import type { categoriesSchema, progressSchema, tracksSchema } from "#scripts/lib/schema.ts";
import { isPassed, nextUnpassedId } from "#scripts/lib/study.ts";
import type { zod } from "#scripts/lib/zod.ts";

type Progress = zod.infer<typeof progressSchema>;
type Tracks = zod.infer<typeof tracksSchema>;
type Categories = zod.infer<typeof categoriesSchema>;

interface Listable {
  id: string;
  track: string;
}

function knownTrackIds({ tracks, trackIds }: { tracks: Tracks; trackIds: readonly string[] }) {
  return trackIds.filter(id => tracks.some(track => track.id === id));
}

export function pickedTrackIds({ tracks, picked }: { tracks: Tracks; picked: readonly string[] }) {
  const known = knownTrackIds({
    tracks,
    trackIds: picked
  });
  const isEveryTrackPicked = known.length === tracks.length;
  return isEveryTrackPicked ? [] : known;
}

export function effectiveTrackIds({ tracks, trackIds }: { tracks: Tracks; trackIds: readonly string[] }) {
  const known = knownTrackIds({
    tracks,
    trackIds
  });
  return known.length > 0 ? known : tracks.map(track => track.id);
}

export function groupTracksByCategory({ categories, tracks }: { categories: Categories; tracks: Tracks }) {
  return categories
    .map(category => ({
      category,
      tracks: tracks.filter(track => track.category === category.id)
    }))
    .filter(group => group.tracks.length > 0);
}

export function selectCourse<Lesson extends Listable>({
  tracks,
  orders,
  lessons,
  role,
  trackIds
}: {
  tracks: Tracks;
  orders: Record<string, string[]>;
  lessons: readonly Lesson[];
  role: string;
  trackIds: readonly string[];
}) {
  const selectedTracks = new Set(
    knownTrackIds({
      tracks,
      trackIds
    })
  );
  const trackOfLesson = new Map(lessons.map(lesson => [lesson.id, lesson.track]));
  const roleOrder = orders[role] ?? orders[ALL_ROLES] ?? [];
  const order = roleOrder.filter(id => selectedTracks.size === 0 || selectedTracks.has(trackOfLesson.get(id) ?? ""));
  const position = new Map(order.map((id, index) => [id, index]));
  const ordered = lessons
    .filter(lesson => position.has(lesson.id))
    .toSorted((left, right) => (position.get(left.id) ?? 0) - (position.get(right.id) ?? 0));
  return {
    tracks,
    lessons: ordered,
    order
  };
}

export function nextLessonId({
  order,
  progress,
  skippedId
}: {
  order: readonly string[];
  progress: Progress;
  skippedId?: string;
}) {
  return nextUnpassedId({
    order: order.filter(id => id !== skippedId),
    progress
  });
}

export function passedCount({ lessons, progress }: { lessons: readonly Listable[]; progress: Progress }) {
  function isLessonPassed(lesson: Listable) {
    return isPassed({
      id: lesson.id,
      progress
    });
  }
  return lessons.filter(isLessonPassed).length;
}

export function trackIdsByRole({
  tracks,
  roles,
  lessons
}: {
  tracks: Tracks;
  roles: readonly { id: string }[];
  lessons: readonly (Listable & { roles: readonly string[] })[];
}) {
  const byRole: Record<string, string[]> = { [ALL_ROLES]: tracks.map(track => track.id) };
  for (const role of roles) {
    const roleTracks = new Set(lessons.filter(lesson => lesson.roles.includes(role.id)).map(lesson => lesson.track));
    byRole[role.id] = tracks.filter(track => roleTracks.has(track.id)).map(track => track.id);
  }

  return byRole;
}
