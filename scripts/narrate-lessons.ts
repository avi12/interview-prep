import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { readLessons } from "#scripts/lib/lessons.ts";
import { narratedInputPath, narratedPath, removeStaleNarrations } from "#scripts/lib/narration-cache.ts";
import { renderLesson } from "#scripts/lib/render.ts";

const NARRATE_REPO = "C:/repositories/avi/reverse-engineer-edge-tts";
const PARALLEL_JOBS = 2;
const [, , ...filters] = process.argv;

const toNativePath = (path: string) => path.replaceAll("\\", "/");

const narrate = ({ input, output }: { input: string; output: string }) =>
  new Promise<boolean>(done => {
    const child = spawn("pnpm", ["--dir", NARRATE_REPO, "narrate", toNativePath(input), "--out", toNativePath(output)], {
      shell: true,
      stdio: ["ignore", "ignore", "inherit"]
    });
    child.on("exit", code => done(code === 0));
  });

const pending = readLessons()
  .filter(lesson => filters.length === 0 || filters.some(filter => lesson.id.startsWith(filter)))
  .map(lesson => {
    const html = renderLesson(lesson);
    return { id: lesson.id, html, output: narratedPath({ id: lesson.id, html }) };
  })
  .filter(({ output }) => !existsSync(output));

console.log(`${pending.length} lessons need narration`);

const queue = [...pending];
let failureCount = 0;

const worker = async () => {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const input = narratedInputPath(job.id);
    mkdirSync(dirname(input), { recursive: true });
    mkdirSync(dirname(job.output), { recursive: true });
    writeFileSync(input, job.html);
    const isDone = await narrate({ input, output: resolve(job.output) });
    if (!isDone) failureCount++;
    if (isDone) removeStaleNarrations({ id: job.id, keepPath: job.output });
    console.log(`${isDone ? "narrated" : "FAILED  "} ${job.id}`);
  }
};

await Promise.all(Array.from({ length: PARALLEL_JOBS }, worker));
console.log(failureCount === 0 ? "Narration done. Run: pnpm build" : `${failureCount} lessons failed to narrate`);
process.exitCode = failureCount === 0 ? 0 : 1;
