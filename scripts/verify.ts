import { resolve } from "node:path";
import { readLessons } from "#scripts/lib/lessons.ts";
import { runQuiet } from "#scripts/lib/run.ts";
import { lessonProblems } from "#scripts/lib/validate.ts";

const [, , ...filters] = process.argv;
const isStructureOnly = filters.includes("--structure");
const idFilters = filters.filter(filter => !filter.startsWith("--"));

const lessons = readLessons().filter(lesson => idFilters.length === 0 || idFilters.some(filter => lesson.id.startsWith(filter)));
let failureCount = 0;

const fail = ({ id, message }: { id: string; message: string }) => {
  failureCount++;
  console.log(`  FAIL ${id}: ${message}`);
};

for (const lesson of lessons) {
  const problems = lessonProblems(lesson);
  for (const message of problems) fail({ id: lesson.id, message });
  if (!lesson.hasExercise || isStructureOnly || problems.length > 0) continue;
  const solution = runQuiet({ lesson, implDir: resolve(lesson.dir, "solution") });
  if (!solution.isPass) fail({ id: lesson.id, message: `solution does not pass its tests\n${solution.output.slice(-1500)}` });
  const starter = runQuiet({ lesson, implDir: resolve(lesson.dir, "starter") });
  if (starter.isPass) fail({ id: lesson.id, message: "starter already passes, so the exercise proves nothing" });
  console.log(`  ok   ${lesson.id}`);
}

console.log(failureCount === 0 ? `\n${lessons.length} lessons verified` : `\n${failureCount} problems in ${lessons.length} lessons`);
process.exitCode = failureCount === 0 ? 0 : 1;
