import { resolve } from "node:path";
import * as vscode from "vscode";
import type { z } from "zod";
import { readJsonFile } from "@scripts/lib/files.ts";
import { INDEX_RELATIVE_PATH, PROGRESS_RELATIVE_PATH } from "@scripts/lib/layout.ts";
import { ALL_ROLES } from "@scripts/lib/path.ts";
import { lessonIndexSchema, progressSchema } from "@scripts/lib/schema.ts";
import { nextUnpassedId } from "@scripts/lib/study.ts";

const EMPTY_INDEX: z.infer<typeof lessonIndexSchema> = { tracks: [], orders: {}, lessons: [] };

export const readIndex = (root: string) =>
  readJsonFile({ path: resolve(root, INDEX_RELATIVE_PATH), schema: lessonIndexSchema, fallback: EMPTY_INDEX });

const readProgress = (root: string) =>
  readJsonFile({ path: resolve(root, PROGRESS_RELATIVE_PATH), schema: progressSchema, fallback: {} });

const selectedRole = () => vscode.workspace.getConfiguration("interviewPrep").get<string>("role", ALL_ROLES);

export const readCourse = (root: string) => {
  const { tracks, lessons, orders } = readIndex(root);
  const order = orders[selectedRole()] ?? [];
  const position = new Map(order.map((id, i) => [id, i]));
  const ordered = lessons.filter(lesson => position.has(lesson.id)).sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
  return { tracks, lessons: ordered, order, progress: readProgress(root) };
};

export type LessonEntry = ReturnType<typeof readIndex>["lessons"][number];

export const findLesson = ({ root, id }: { root: string; id: string }) => readIndex(root).lessons.find(lesson => lesson.id === id);

export const findNextLesson = (root: string) => {
  const { lessons, order, progress } = readCourse(root);
  const nextId = nextUnpassedId({ order, progress });
  return lessons.find(lesson => lesson.id === nextId);
};
