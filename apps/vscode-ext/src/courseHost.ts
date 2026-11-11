import type { NarrationReply, NarrationRequest } from "@scripts/lib/narration-host.ts";
import type { Progress } from "@scripts/lib/progress-sync.ts";
import type { RunResult } from "@scripts/lib/run-result.ts";
import type { lessonIndexSchema } from "@scripts/lib/schema.ts";
import type { z } from "@scripts/lib/zod.ts";
import type * as vscode from "vscode";

export type LessonIndex = z.infer<typeof lessonIndexSchema>;
export type LessonEntry = LessonIndex["lessons"][number];

export type TestReport = Pick<RunResult, "output" | "queryResults" | "testCases">;

export type TestsFinished = {
  id: string;
  isPass: boolean;
};

export type CourseContext = Pick<vscode.ExtensionContext, "globalState" | "subscriptions" | "workspaceState">;

export type CourseSession = {
  activeLessonId: () => string | undefined;
  activeLesson: () => LessonEntry | undefined;
  lessonEditor: () => vscode.TextEditor | undefined;
  reloadLessons: () => Promise<void>;
};

export type LocalFeatures = {
  answerNarration: (request: NarrationRequest) => Promise<NarrationReply>;
  register: (session: CourseSession) => vscode.Disposable[];
};

export type LessonAddress = {
  initialLessonId: () => string | undefined;
  showLesson: (lessonId: string) => void;
};

export type CourseHost = {
  address?: LessonAddress;
  workspaceRoot: vscode.Uri;
  readCourseFile: (relativePath: string) => Promise<string | null>;
  readElementsBundle: () => Promise<string>;
  readProgress: () => Promise<Progress>;
  onDidChangeProgress: vscode.Event<void>;
  ensureExerciseFiles: (lesson: LessonEntry) => Promise<void>;
  resetExercise: (lesson: LessonEntry) => Promise<void>;
  runTests: (lesson: LessonEntry) => Promise<void>;
  onDidFinishTests: vscode.Event<TestsFinished>;
  readTestReport: (lessonId: string) => Promise<TestReport>;
  markDone: (lesson: LessonEntry) => Promise<void>;
  local?: LocalFeatures;
  dispose: () => void;
};
