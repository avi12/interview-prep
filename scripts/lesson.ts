import { resolve } from "node:path";
import { findLesson, readLessons, readStudyOrders, readTracks } from "#scripts/lib/lessons.ts";
import { ALL_ROLES } from "#scripts/lib/path.ts";
import { isPassed, readProgress, recordAttempt } from "#scripts/lib/progress.ts";
import { ensureWorkCopy, resetWorkCopy, runTests } from "#scripts/lib/run.ts";

const [command, idArgument, ...flags] = process.argv.slice(2);
const isSolutionRequested = flags.includes("--solution");

const listLessons = () => {
  const progress = readProgress();
  const lessons = readLessons({ isStrict: false });
  for (const track of readTracks()) {
    const inTrack = lessons.filter(l => l.track === track.id);
    if (inTrack.length === 0) continue;
    console.log(`\n${track.title}`);
    for (const lesson of inTrack) {
      const mark = isPassed({ id: lesson.id, progress }) ? "x" : " ";
      console.log(`  [${mark}] ${lesson.id}  (${lesson.meta.minutes} min, ${lesson.meta.lang})`);
    }
  }
};

const openLesson = (id: string) => {
  const lesson = findLesson(id);
  if (!lesson.hasExercise) return console.log(`${lesson.id} is a reading lesson, nothing to code`);
  const isCreated = ensureWorkCopy(lesson);
  console.log(isCreated ? "Created your copy:" : "Your copy already exists:");
  for (const file of lesson.meta.files) console.log(`  ${resolve(lesson.workDir, file)}`);
};

const testLesson = (id: string) => {
  const lesson = findLesson(id);
  if (!lesson.hasExercise) return console.log("Reading lesson, no tests");
  ensureWorkCopy(lesson);
  const implDir = isSolutionRequested ? resolve(lesson.dir, "solution") : lesson.workDir;
  const isPass = runTests({ lesson, implDir });
  if (!isSolutionRequested) recordAttempt({ id: lesson.id, isPass });
  console.log(isPass ? "\nPASS - next lesson: pnpm lesson next" : "\nNot yet - read the first failing test, fix one thing, run again");
  process.exitCode = isPass ? 0 : 1;
};

const resetLesson = (id: string) => {
  resetWorkCopy(findLesson(id));
  console.log("Reset to the starter");
};

const showNext = () => {
  const progress = readProgress();
  const lessons = readLessons({ isStrict: false });
  const order = readStudyOrders(lessons)[idArgument ?? ALL_ROLES] ?? [];
  const nextId = order.find(id => !isPassed({ id, progress }));
  const next = lessons.find(l => l.id === nextId);
  console.log(next ? `Next: ${next.id} - ${next.meta.title}` : "All lessons passed");
};

const COMMANDS: Record<string, () => unknown> = {
  list: listLessons,
  open: () => openLesson(idArgument),
  test: () => testLesson(idArgument),
  reset: () => resetLesson(idArgument),
  next: showNext
};

const handler = COMMANDS[command];
if (!handler) {
  console.log("Usage: pnpm lesson <list|open|test|reset> <lesson-id> [--solution]   |   pnpm lesson next [backend|analyst|ai]");
  process.exit(1);
}
handler();
