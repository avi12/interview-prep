import type { NarrationReply, NarrationRequest } from "@scripts/lib/narration-host.ts";
import type { Progress } from "@scripts/lib/progress-sync.ts";
import type { RunResult } from "@scripts/lib/run-result.ts";
import type { lessonIndexSchema } from "@scripts/lib/schema.ts";
import type { zod } from "@scripts/lib/zod.ts";
import type * as vscode from "vscode";

export type LessonIndex = zod.infer<typeof lessonIndexSchema>;
export type LessonEntry = LessonIndex["lessons"][number];

export type TestReport = Pick<RunResult, "output" | "queryResults" | "testCases">;

export interface TestsFinished {
  id: string;
  isPass: boolean;
}

export type CourseContext = Pick<vscode.ExtensionContext, "globalState" | "subscriptions" | "workspaceState">;

export interface CourseSession {
  activeLessonId: () => string | undefined;
  activeLesson: () => LessonEntry | undefined;
  lessonEditor: () => vscode.TextEditor | undefined;
  reloadLessons: () => Promise<void>;
}

export interface LocalFeatures {
  answerNarration: (request: NarrationRequest) => Promise<NarrationReply>;
  register: (session: CourseSession) => vscode.Disposable[];
}

export interface LessonAddress {
  initialLessonId: () => string | undefined;
  showLesson: (lessonId: string) => void;
}

export interface CourseHost {
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
}
