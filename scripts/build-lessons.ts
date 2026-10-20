import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { writeFileDeep } from "#scripts/lib/files.ts";
import { INDEX_FILE, LESSONS_DIST_DIR } from "#scripts/lib/paths.ts";
import { readLessons, readStudyOrders, readTracks } from "#scripts/lib/lessons.ts";
import { withCachedNarration } from "#scripts/lib/narration-cache.ts";
import { renderLesson } from "#scripts/lib/render.ts";

const RM_MAX_RETRIES = 5;
const RM_RETRY_DELAY_MS = 100;

const lessons = readLessons();
rmSync(LESSONS_DIST_DIR, { recursive: true, force: true, maxRetries: RM_MAX_RETRIES, retryDelay: RM_RETRY_DELAY_MS });

const narratedIds = new Set<string>();
for (const lesson of lessons) {
  const { html, isNarrated } = withCachedNarration({ id: lesson.id, html: renderLesson(lesson) });
  if (isNarrated) narratedIds.add(lesson.id);
  writeFileDeep({ path: resolve(LESSONS_DIST_DIR, `${lesson.id}.html`), content: html });
}

const index = {
  tracks: readTracks(),
  orders: readStudyOrders(lessons),
  lessons: lessons.map(lesson => ({
    id: lesson.id,
    track: lesson.track,
    title: lesson.meta.title,
    minutes: lesson.meta.minutes,
    lang: lesson.meta.lang,
    roles: lesson.meta.roles,
    files: lesson.meta.files,
    hasExercise: lesson.hasExercise,
    isNarrated: narratedIds.has(lesson.id),
    html: `dist/lessons/${lesson.id}.html`
  }))
};

writeFileDeep({ path: INDEX_FILE, content: JSON.stringify(index, null, 2) });
console.log(`Built ${lessons.length} lessons into dist/lessons (${narratedIds.size} narrated)`);
