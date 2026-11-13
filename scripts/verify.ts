import { resolve } from "node:path";

import { readLessonEntries } from "#scripts/lib/lessons.ts";
import { prepareSolutionDir, runQuiet } from "#scripts/lib/run.ts";
import { lessonProblems } from "#scripts/lib/validate.ts";

const OUTPUT_TAIL_CHARS = 1500;

const [, , ...filters] = process.argv;
const IS_STRUCTURE_ONLY = filters.includes("--structure");
const idFilters = filters.filter(filter => !filter.startsWith("--"));

const entries = readLessonEntries().filter(
  entry => idFilters.length === 0 || idFilters.some(filter => entry.id.startsWith(filter))
);
let failureCount = 0;

function fail({ id, message }: { id: string; message: string }) {
  failureCount++;
  console.log(`  FAIL ${id}: ${message}`);
}

for (const { id, lesson, error } of entries) {
  if (!lesson) {
    fail({
      id,
      message: `cannot be read: ${error}`
    });
    continue;
  }

  const problems = lessonProblems(lesson);
  for (const message of problems) {
    fail({
      id: lesson.id,
      message
    });
  }
  const isSkippedLesson = !lesson.hasExercise || IS_STRUCTURE_ONLY || problems.length > 0;
  if (isSkippedLesson) {
    continue;
  }

  const solution = await runQuiet({
    lesson,
    implDir: prepareSolutionDir(lesson)
  });
  if (!solution.isPass) {
    fail({
      id: lesson.id,
      message: `solution does not pass its tests\n${solution.output.slice(-OUTPUT_TAIL_CHARS)}`
    });
  }

  const starter = await runQuiet({
    lesson,
    implDir: resolve(lesson.dir, "starter")
  });
  if (starter.isPass) {
    fail({
      id: lesson.id,
      message: "starter already passes, so the exercise proves nothing"
    });
  }

  console.log(`  ok   ${lesson.id}`);
}

console.log(
  failureCount === 0
    ? `\n${entries.length} lessons verified`
    : `\n${failureCount} problems in ${entries.length} lessons`
);
process.exitCode = failureCount === 0 ? 0 : 1;
