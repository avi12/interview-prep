import { NO_RESULT_TABLE_FLAG } from "#scripts/lib/layout.ts";
import { findLesson, readLessons, readStudyOrders, readTracks } from "#scripts/lib/lessons.ts";
import { DONE_COMMAND } from "#scripts/lib/panel.ts";
import { ALL_ROLES } from "#scripts/lib/path.ts";
import { readProgress, recordAttempt, recordLastTest } from "#scripts/lib/progress.ts";
import { formatQueryResult } from "#scripts/lib/query-result.ts";
import { ensureWorkCopy, prepareSolutionDir, resetWorkCopy, runQuiet } from "#scripts/lib/run.ts";
import { groupByTrack, isPassed, nextUnpassedId } from "#scripts/lib/study.ts";
import { resolve } from "node:path";

const [command, idArgument, ...flags] = process.argv.slice(2);
const isSolutionRequested = flags.includes("--solution");
const isResultTableShown = !flags.includes(NO_RESULT_TABLE_FLAG);

function listLessons() {
  const progress = readProgress();
  const groups = groupByTrack({
    tracks: readTracks(),
    lessons: readLessons({ isStrict: false })
  });
  for (const { track, lessons } of groups) {
    console.log(`\n${track.title}`);
    for (const lesson of lessons) {
      const mark = isPassed({
        id: lesson.id,
        progress
      }) ? "x" : " ";
      console.log(`  [${mark}] ${lesson.id}  (${lesson.meta.minutes} min, ${lesson.meta.lang})`);
    }
  }
}

function openLesson(id: string) {
  const lesson = findLesson(id);
  if (!lesson.hasExercise) {
    return console.log(`${lesson.id} is a reading lesson, nothing to code`);
  }

  const isCreated = ensureWorkCopy(lesson);
  console.log(isCreated ? "Created your copy:" : "Your copy already exists:");
  for (const file of lesson.meta.files) {
    console.log(`  ${resolve(lesson.workDir, file)}`);
  }
}

async function testLesson(id: string) {
  const lesson = findLesson(id);
  if (!lesson.hasExercise) {
    return console.log("Reading lesson, no tests");
  }

  ensureWorkCopy(lesson);
  const implDir = isSolutionRequested ? prepareSolutionDir(lesson) : lesson.workDir;
  const { isPass, output, queryResults } = await runQuiet({
    lesson,
    implDir
  });
  console.log(output);
  for (const result of isResultTableShown ? queryResults : []) {
    console.log(formatQueryResult(result));
  }

  if (!isSolutionRequested) {
    recordAttempt({
      id: lesson.id,
      isPass
    });
    recordLastTest({
      id: lesson.id,
      isPass,
      output
    });
  }

  console.log(isPass ? "\nPASS - next lesson: pnpm lesson next" : "\nNot yet - read the first failing test, fix one thing, run again");
  process.exitCode = isPass ? 0 : 1;
}

function markDone(id: string) {
  const lesson = findLesson(id);
  if (lesson.hasExercise) {
    console.log(`${lesson.id} has an exercise: pass its tests with pnpm lesson test ${lesson.id}`);
    process.exitCode = 1;
    return;
  }

  recordAttempt({
    id: lesson.id,
    isPass: true
  });
  console.log("Marked done - next lesson: pnpm lesson next");
}

function resetLesson(id: string) {
  resetWorkCopy(findLesson(id));
  console.log("Reset to the starter");
}

function showNext() {
  const progress = readProgress();
  const lessons = readLessons({ isStrict: false });
  const order = readStudyOrders(lessons)[idArgument ?? ALL_ROLES] ?? [];
  const nextId = nextUnpassedId({
    order,
    progress
  });
  const next = lessons.find(lesson => lesson.id === nextId);
  console.log(next ? `Next: ${next.id} - ${next.meta.title}` : "All lessons passed");
}

const COMMANDS: Record<string, () => unknown> = {
  list: listLessons,
  open: () => openLesson(idArgument),
  test: () => testLesson(idArgument),
  reset: () => resetLesson(idArgument),
  [DONE_COMMAND]: () => markDone(idArgument),
  next: showNext
};

const handler = COMMANDS[command];
if (!handler) {
  console.log("Usage: pnpm lesson <list|open|test|reset|done> <lesson-id> [--solution]   |   pnpm lesson next [backend|analyst|ai]");
  process.exit(1);
}

await handler();
