import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as vscode from "vscode";
import { ALL_ROLES } from "@scripts/lib/path.ts";
import type { z } from "zod";
import { lessonIndexSchema, progressSchema } from "@scripts/lib/schema.ts";

const INDEX_PATH = "dist/index.json";
const PROGRESS_PATH = ".progress/progress.json";
const EMPTY_INDEX: z.infer<typeof lessonIndexSchema> = { tracks: [], orders: {}, lessons: [] };

export const readIndex = (root: string) => {
  const path = resolve(root, INDEX_PATH);
  if (!existsSync(path)) return EMPTY_INDEX;
  const parsed = lessonIndexSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  return parsed.success ? parsed.data : EMPTY_INDEX;
};

export const readProgress = (root: string) => {
  const path = resolve(root, PROGRESS_PATH);
  if (!existsSync(path)) return {};
  const parsed = progressSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  return parsed.success ? parsed.data : {};
};

export const selectedRole = () => vscode.workspace.getConfiguration("interviewPrep").get<string>("role", ALL_ROLES);

export const lessonsForRole = (root: string) => {
  const role = selectedRole();
  const { lessons, orders } = readIndex(root);
  const position = new Map((orders[role] ?? []).map((id, i) => [id, i]));
  return lessons.filter(lesson => position.has(lesson.id)).sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
};

export type LessonEntry = ReturnType<typeof readIndex>["lessons"][number];

export const findLesson = ({ root, id }: { root: string; id: string }) => readIndex(root).lessons.find(lesson => lesson.id === id);

export const isPassed = ({ progress, id }: { progress: ReturnType<typeof readProgress>; id: string }) => Boolean(progress[id]?.passedAt);

export const findNextLesson = (root: string) => {
  const progress = readProgress(root);
  return lessonsForRole(root).find(lesson => !isPassed({ progress, id: lesson.id }));
};
