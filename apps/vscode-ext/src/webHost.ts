import type {
  CourseHost,
  LessonAddress,
  LessonEntry,
  TestReport,
  TestsFinished
} from "@/courseHost.ts";
import { lessonWorkUri } from "@/workspaceLayout.ts";
import type { Progress } from "@scripts/lib/progress-sync.ts";
import type { RunResult } from "@scripts/lib/run-result.ts";
import * as vscode from "vscode";

export type LessonFile = {
  path: string;
  content: string;
};

export type RunLesson = (request: {
  lesson: LessonEntry;
  files: readonly LessonFile[];
}) => Promise<RunResult>;

export type ProgressSource = {
  current: () => Progress;
  subscribe: (listener: () => void) => () => void;
  markPassed: (lessonId: string) => Promise<void>;
};

export type WebHostDependencies = {
  address: LessonAddress;
  courseBaseUrl: string;
  elementsBundle: string;
  workspaceRoot: vscode.Uri;
  readStarter: (lessonId: string) => Promise<readonly LessonFile[]>;
  runLesson: RunLesson;
  progress: ProgressSource;
};

const PATH_SEPARATOR = "/";
const IS_UNTITLED_SAVED = false;
const EMPTY_REPORT: TestReport = {
  output: "",
  queryResults: [],
  testCases: []
};

function failedRun(error: unknown) {
  return {
    ...EMPTY_REPORT,
    output: error instanceof Error ? error.message : String(error),
    isPass: false,
    isTimedOut: false
  } satisfies RunResult;
}

function exists(uri: vscode.Uri) {
  return vscode.workspace.fs.stat(uri).then(() => true, () => false);
}

async function readTree({ dir, prefix }: {
  dir: vscode.Uri;
  prefix: string;
}): Promise<LessonFile[]> {
  const decoder = new TextDecoder();
  const files: LessonFile[] = [];
  for (const [name, type] of await vscode.workspace.fs.readDirectory(dir)) {
    const uri = vscode.Uri.joinPath(dir, name);
    const path = prefix ? `${prefix}${PATH_SEPARATOR}${name}` : name;
    if (type === vscode.FileType.Directory) {
      files.push(
        ...await readTree({
          dir: uri,
          prefix: path
        })
      );
      continue;
    }

    if (type === vscode.FileType.File) {
      files.push({
        path,
        content: decoder.decode(await vscode.workspace.fs.readFile(uri))
      });
    }
  }
  return files;
}

export function createWebCourseHost({
  address,
  courseBaseUrl,
  elementsBundle,
  workspaceRoot,
  readStarter,
  runLesson,
  progress
}: WebHostDependencies) {
  const testsFinished = new vscode.EventEmitter<TestsFinished>();
  const reports = new Map<string, TestReport>();
  const encoder = new TextEncoder();

  function workDirOf(lesson: LessonEntry) {
    return lessonWorkUri({
      root: workspaceRoot,
      lessonId: lesson.id
    });
  }

  async function writeStarter(lesson: LessonEntry) {
    const workDir = workDirOf(lesson);
    for (const { path, content } of await readStarter(lesson.id)) {
      await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(workDir, path), encoder.encode(content));
    }
  }

  async function ensureExerciseFiles(lesson: LessonEntry) {
    if (await exists(workDirOf(lesson))) {
      return;
    }

    await writeStarter(lesson);
  }

  async function runSafely(lesson: LessonEntry) {
    try {
      await vscode.workspace.saveAll(IS_UNTITLED_SAVED);
      await ensureExerciseFiles(lesson);
      const files = await readTree({
        dir: workDirOf(lesson),
        prefix: ""
      });
      return await runLesson({
        lesson,
        files
      });
    } catch (error) {
      return failedRun(error);
    }
  }

  async function runAndReport(lesson: LessonEntry) {
    const { isPass, output, queryResults, testCases } = await runSafely(lesson);
    reports.set(lesson.id, {
      output,
      queryResults,
      testCases
    });

    try {
      if (isPass) {
        await progress.markPassed(lesson.id);
      }
    } finally {
      testsFinished.fire({
        id: lesson.id,
        isPass
      });
    }
  }

  return {
    workspaceRoot,
    address,
    readElementsBundle: async () => elementsBundle,
    readCourseFile: relativePath => fetch(new URL(relativePath, courseBaseUrl)).then(
      response => response.ok ? response.text() : null,
      () => null
    ),
    readProgress: async () => progress.current(),
    onDidChangeProgress: listener => new vscode.Disposable(progress.subscribe(() => listener())),
    ensureExerciseFiles,
    async resetExercise(lesson) {
      const workDir = workDirOf(lesson);
      if (await exists(workDir)) {
        await vscode.workspace.fs.delete(workDir, {
          recursive: true,
          useTrash: false
        });
      }

      await writeStarter(lesson);
    },
    runTests(lesson) {
      void runAndReport(lesson);
      return Promise.resolve();
    },
    onDidFinishTests: testsFinished.event,
    readTestReport: async lessonId => reports.get(lessonId) ?? EMPTY_REPORT,
    markDone: lesson => progress.markPassed(lesson.id),
    dispose: () => testsFinished.dispose()
  } satisfies CourseHost;
}
