import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { readJsonFile } from "@scripts/lib/files.ts";
import { LAST_TEST_RELATIVE_PATH, PROGRESS_RELATIVE_PATH } from "@scripts/lib/layout.ts";
import { DONE_COMMAND } from "@scripts/lib/panel.ts";
import { parseQueryResults, queryResultsRelativePath } from "@scripts/lib/query-result.ts";
import { readRecordText } from "@scripts/lib/record-file.ts";
import { lastTestSchema, progressSchema } from "@scripts/lib/schema.ts";
import { parseTestCases, testCasesRelativePath } from "@scripts/lib/test-cases.ts";
import * as vscode from "vscode";

import type { CourseHost, LocalFeatures } from "@/courseHost.ts";
import { onTestsFinished, runLessonCli, runTestsInTerminal } from "@/lessonCli.ts";

const LessonCliCommand = {
  OPEN: "open",
  RESET: "reset"
} as const;

export function readLastTest({ root, lessonId }: { root: string; lessonId: string }) {
  const lastTest = readJsonFile({
    path: resolve(root, LAST_TEST_RELATIVE_PATH),
    schema: lastTestSchema.nullable(),
    fallback: null
  });
  return lastTest?.id === lessonId ? lastTest : null;
}

function watchProgress(root: string) {
  const changed = new vscode.EventEmitter<void>();
  const pattern = new vscode.RelativePattern(vscode.Uri.file(root), PROGRESS_RELATIVE_PATH);
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);
  watcher.onDidChange(() => changed.fire());
  watcher.onDidCreate(() => changed.fire());
  return {
    onDidChange: changed.event,
    dispose() {
      watcher.dispose();
      changed.dispose();
    }
  };
}

export function createNodeCourseHost({
  root,
  elementsBundlePath,
  local
}: {
  root: string;
  elementsBundlePath: string;
  local: LocalFeatures;
}) {
  const progressWatch = watchProgress(root);

  async function readCourseFile(relativePath: string) {
    const path = resolve(root, relativePath);
    return existsSync(path) ? readFile(path, "utf8") : null;
  }

  function runCli(args: string[]) {
    return runLessonCli({
      root,
      args
    });
  }

  return {
    workspaceRoot: vscode.Uri.file(root),
    readCourseFile,
    readElementsBundle: () => readFile(elementsBundlePath, "utf8"),
    readProgress: async () =>
      readJsonFile({
        path: resolve(root, PROGRESS_RELATIVE_PATH),
        schema: progressSchema,
        fallback: {}
      }),
    onDidChangeProgress: progressWatch.onDidChange,
    async ensureExerciseFiles({ id }) {
      await runCli([LessonCliCommand.OPEN, id]);
    },
    async resetExercise({ id }) {
      await runCli([LessonCliCommand.RESET, id]);
    },
    runTests: ({ id }) =>
      runTestsInTerminal({
        root,
        id
      }),
    onDidFinishTests: listener => onTestsFinished(listener),
    readTestReport: async lessonId => ({
      output:
        readLastTest({
          root,
          lessonId
        })?.output ?? "",
      queryResults: parseQueryResults(readRecordText(resolve(root, queryResultsRelativePath(lessonId)))),
      testCases: parseTestCases(readRecordText(resolve(root, testCasesRelativePath(lessonId))))
    }),
    async markDone({ id }) {
      await runCli([DONE_COMMAND, id]);
    },
    local,
    dispose: () => progressWatch.dispose()
  } satisfies CourseHost;
}
