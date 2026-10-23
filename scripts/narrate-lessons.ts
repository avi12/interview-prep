import { ensureParentDir, writeFileDeep } from "#scripts/lib/files.ts";
import { readLessons } from "#scripts/lib/lessons.ts";
import { narratedInputPath, narratedPath, removeStaleNarrations } from "#scripts/lib/narration-cache.ts";
import { NARRATE_TOOL_DIR, ROOT } from "#scripts/lib/paths.ts";
import { renderLesson } from "#scripts/lib/render.ts";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const PARALLEL_JOBS = 1;
const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 4000;
const [, , ...filters] = process.argv;

function toNativePath(path: string) {
  return path.replaceAll("\\", "/");
}

function narrate({ input, output }: {
  input: string;
  output: string;
}) {
  return new Promise<boolean>(done => {
    const child = spawn("pnpm", ["--dir", toNativePath(NARRATE_TOOL_DIR), "narrate", toNativePath(input), "--out", toNativePath(output)], {
      shell: true,
      stdio: ["ignore", "ignore", "inherit"]
    });
    child.on("exit", code => done(code === 0));
  });
}

async function narrateWithRetry({ input, output }: {
  input: string;
  output: string;
}) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (await narrate({
      input,
      output
    })) {
      return true;
    }

    await sleep(RETRY_DELAY_MS * attempt);
  }
  return false;
}

function runVisibly({ command, args, cwd }: {
  command: string;
  args: string[];
  cwd: string;
}) {
  return spawnSync(command, args, {
    cwd,
    shell: true,
    stdio: "inherit"
  }).status === 0;
}

function ensureNarrateTool() {
  const isCheckedOut = existsSync(resolve(NARRATE_TOOL_DIR, "package.json"));
  if (!isCheckedOut && !runVisibly({
    command: "git",
    args: ["submodule", "update", "--init", "--", toNativePath(NARRATE_TOOL_DIR)],
    cwd: ROOT
  })) {
    return false;
  }

  const isInstalled = existsSync(resolve(NARRATE_TOOL_DIR, "node_modules"));
  return isInstalled || runVisibly({
    command: "pnpm",
    args: ["install"],
    cwd: NARRATE_TOOL_DIR
  });
}

const pending = readLessons({ isStrict: false })
  .filter(lesson => filters.length === 0 || filters.some(filter => lesson.id.startsWith(filter)))
  .map(lesson => {
    const html = renderLesson(lesson);
    return {
      id: lesson.id,
      html,
      output: narratedPath({
        id: lesson.id,
        html
      })
    };
  })
  .filter(({ output }) => !existsSync(output));

console.log(`${pending.length} lessons need narration`);

if (pending.length > 0 && !ensureNarrateTool()) {
  console.error(`Could not set up the narration tool in ${NARRATE_TOOL_DIR}`);
  process.exit(1);
}

const queue = [...pending];
let failureCount = 0;

async function worker() {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const input = narratedInputPath(job.id);
    writeFileDeep({
      path: input,
      content: job.html
    });
    ensureParentDir(job.output);
    const isDone = await narrateWithRetry({
      input,
      output: resolve(job.output)
    });
    if (!isDone) {
      failureCount++;
    }

    if (isDone) {
      removeStaleNarrations({
        id: job.id,
        keepPath: job.output
      });
    }

    console.log(`${isDone ? "narrated" : "FAILED  "} ${job.id}`);
  }
}

await Promise.all(Array.from({ length: PARALLEL_JOBS }, worker));
console.log(failureCount === 0 ? "Narration done. Run: pnpm build" : `${failureCount} lessons failed to narrate`);
process.exitCode = failureCount === 0 ? 0 : 1;
