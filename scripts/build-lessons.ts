import { rmSync } from "node:fs";
import { resolve } from "node:path";

import { writeFileDeep } from "#scripts/lib/files.ts";
import { LESSONS_DIST_RELATIVE_DIR, RUNNER_DIST_RELATIVE_DIR } from "#scripts/lib/layout.ts";
import { readCategories, readLessons, readRoles, readStudyOrders, readTracks } from "#scripts/lib/lessons.ts";
import { INDEX_FILE, LESSONS_DIST_DIR, ROOT } from "#scripts/lib/paths.ts";
import { renderLesson } from "#scripts/lib/render.ts";
import { writeRunnerData } from "#scripts/lib/runner-data.ts";
import { createSqlSchemaReader } from "#scripts/lib/sql-schema.ts";
import { tutorNotes } from "#scripts/lib/tutor-notes.ts";

const RM_MAX_RETRIES = 5;
const RM_RETRY_DELAY_MS = 100;
const HTML_EXTENSION = ".html";
const TUTOR_EXTENSION = ".tutor.json";

function distPath({ id, extension }: { id: string; extension: string }) {
  return `${LESSONS_DIST_RELATIVE_DIR}/${id}${extension}`;
}

const lessons = readLessons();
rmSync(LESSONS_DIST_DIR, {
  recursive: true,
  force: true,
  maxRetries: RM_MAX_RETRIES,
  retryDelay: RM_RETRY_DELAY_MS
});

for (const lesson of lessons) {
  const html = renderLesson(lesson);
  writeFileDeep({
    path: resolve(
      ROOT,
      distPath({
        id: lesson.id,
        extension: HTML_EXTENSION
      })
    ),
    content: html
  });
  writeFileDeep({
    path: resolve(
      ROOT,
      distPath({
        id: lesson.id,
        extension: TUTOR_EXTENSION
      })
    ),
    content: JSON.stringify(tutorNotes(lesson), null, 2)
  });
}

const sqlSchema = await createSqlSchemaReader();
const sqlTablesById = new Map<string, Awaited<ReturnType<typeof sqlSchema.tablesOf>>>();
for (const lesson of lessons) {
  sqlTablesById.set(lesson.id, await sqlSchema.tablesOf(lesson));
}
await sqlSchema.close();

const index = {
  categories: readCategories(),
  tracks: readTracks(),
  roles: readRoles(),
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
    html: distPath({
      id: lesson.id,
      extension: HTML_EXTENSION
    }),
    tutor: distPath({
      id: lesson.id,
      extension: TUTOR_EXTENSION
    }),
    sqlTables: sqlTablesById.get(lesson.id) ?? []
  }))
};

writeFileDeep({
  path: INDEX_FILE,
  content: JSON.stringify(index, null, 2)
});
console.log(`Built ${lessons.length} lessons into ${LESSONS_DIST_RELATIVE_DIR}`);
const runnableCount = await writeRunnerData(lessons);
console.log(`Wrote browser test data for ${runnableCount} lessons into ${RUNNER_DIST_RELATIVE_DIR}`);
