import { type RunRequest, runResponseSchema } from "@/runner/ts/protocol.ts";
import { implDirOf, lessonDirOf, VIRTUAL_ROOT, virtualPath } from "@/runner/virtual-root.ts";
import { request } from "@/runner/worker-channel.ts";
import type { LessonFiles, RunnerKit, RunnerLesson } from "#scripts/lib/runner-bundle.ts";

const TEST_FILE = /^tests\/[^/]+\.test\.ts$/;

function underRoot({ files, root }: {
  files: LessonFiles;
  root: string;
}) {
  return Object.fromEntries(Object.entries(files).map(([path, text]) => [`${root}/${path}`, text]));
}

export function runTsLesson({ lesson, kit, files, signal, timeoutMs }: {
  lesson: RunnerLesson;
  kit: RunnerKit;
  files: LessonFiles;
  signal: AbortSignal;
  timeoutMs: number;
}) {
  const lessonDir = lessonDirOf(lesson.id);
  const implDir = implDirOf(lesson.id);
  const message: RunRequest = {
    files: {
      ...underRoot({
        files: kit.tsFiles,
        root: VIRTUAL_ROOT
      }),
      ...underRoot({
        files: lesson.files,
        root: lessonDir
      }),
      ...underRoot({
        files,
        root: implDir
      })
    },
    testFiles: Object.keys(lesson.files).filter(path => TEST_FILE.test(path)).map(path => `${lessonDir}/${path}`),
    setupFiles: kit.setupFiles.map(virtualPath),
    implDir,
    importMap: Object.fromEntries(
      Object.entries(kit.importMap).map(([prefix, target]) => [
        prefix,
        virtualPath(target)
      ])
    ),
    testTimeoutMs: kit.testTimeoutMs,
    hookTimeoutMs: kit.hookTimeoutMs,
    isRecording: true
  };
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  return request({
    worker,
    message,
    schema: runResponseSchema,
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
  }).finally(() => worker.terminate());
}
