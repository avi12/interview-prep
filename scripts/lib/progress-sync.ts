import type { progressSchema } from "#scripts/lib/schema.ts";
import { zod } from "#scripts/lib/zod.ts";

export type Progress = zod.infer<typeof progressSchema>;
export type LessonProgress = Progress[string];

const LESSON_ID_PATTERN = /^[a-z0-9]+\/[a-z0-9-]+$/;
const MAX_TRACKED_LESSONS = 2000;
const MAX_ATTEMPTS = 1_000_000;

export const PROGRESS_API_PATH = "/api/progress";

export const syncedProgressSchema = zod
  .record(
    zod.string().regex(LESSON_ID_PATTERN),
    zod
      .object({
        attempts: zod.number().int().min(0).max(MAX_ATTEMPTS),
        passedAt: zod.iso.datetime().nullable()
      })
      .strict()
  )
  .refine(progress => Object.keys(progress).length <= MAX_TRACKED_LESSONS, {
    message: `at most ${MAX_TRACKED_LESSONS} lessons`
  });

export const progressResponseSchema = zod.object({ progress: syncedProgressSchema }).strict();
export const progressUpdateSchema = zod.object({ progress: syncedProgressSchema }).strict();

function earlierPassedAt({ left, right }: { left: string | null; right: string | null }) {
  if (left === null) {
    return right;
  }

  if (right === null) {
    return left;
  }

  return Date.parse(left) <= Date.parse(right) ? left : right;
}

function mergeLesson({ left, right }: { left?: LessonProgress; right?: LessonProgress }) {
  return {
    attempts: Math.max(left?.attempts ?? 0, right?.attempts ?? 0),
    passedAt: earlierPassedAt({
      left: left?.passedAt ?? null,
      right: right?.passedAt ?? null
    })
  };
}

export function mergeProgress({ left, right }: { left: Progress; right: Progress }) {
  const merged: Progress = {};
  for (const id of new Set([...Object.keys(left), ...Object.keys(right)])) {
    merged[id] = mergeLesson({
      left: left[id],
      right: right[id]
    });
  }
  return merged;
}

export function markPassed({ progress, id, passedAt }: { progress: Progress; id: string; passedAt: string }) {
  const previous = progress[id] ?? {
    attempts: 0,
    passedAt: null
  };
  return {
    ...progress,
    [id]: {
      attempts: previous.attempts + 1,
      passedAt: previous.passedAt ?? passedAt
    }
  };
}
