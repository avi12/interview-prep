import { readJsonFile } from "@scripts/lib/files.ts";
import { INDEX_RELATIVE_PATH, PROGRESS_RELATIVE_PATH } from "@scripts/lib/layout.ts";
import { ALL_ROLES } from "@scripts/lib/path.ts";
import { lessonIndexSchema, progressSchema } from "@scripts/lib/schema.ts";
import { isPassed, nextUnpassedId } from "@scripts/lib/study.ts";
import type { z } from "@scripts/lib/zod.ts";
import { resolve } from "node:path";
import * as vscode from "vscode";

const EMPTY_INDEX: z.infer<typeof lessonIndexSchema> = {
  tracks: [],
  roles: [],
  orders: {},
  lessons: []
};

function readIndex(root: string) {
  return readJsonFile({
    path: resolve(root, INDEX_RELATIVE_PATH),
    schema: lessonIndexSchema,
    fallback: EMPTY_INDEX
  });
}

function readProgress(root: string) {
  return readJsonFile({
    path: resolve(root, PROGRESS_RELATIVE_PATH),
    schema: progressSchema,
    fallback: {}
  });
}

const ROLE_SETTING = "role";
const ALL_ROLES_TITLE = "All roles";

function settings() {
  return vscode.workspace.getConfiguration("interviewPrep");
}

function selectedRole() {
  return settings().get<string>(ROLE_SETTING, ALL_ROLES);
}

export async function chooseRole(root: string) {
  const choices = [{
    id: ALL_ROLES,
    title: ALL_ROLES_TITLE
  }, ...readIndex(root).roles];
  const current = selectedRole();
  const picked = await vscode.window.showQuickPick(
    choices.map(({ id, title }) => ({
      id,
      label: title,
      description: id === current ? "current" : undefined
    })),
    { placeHolder: "Show the lessons for which role?" }
  );
  if (!picked) {
    return;
  }

  await settings().update(ROLE_SETTING, picked.id, vscode.ConfigurationTarget.Workspace);
}

export function readCourse(root: string) {
  const { tracks, lessons, orders } = readIndex(root);
  const order = orders[selectedRole()] ?? [];
  const position = new Map(order.map((id, index) => [id, index]));
  const ordered = lessons
    .filter(lesson => position.has(lesson.id))
    .sort((left, right) => (position.get(left.id) ?? 0) - (position.get(right.id) ?? 0));
  return {
    tracks,
    lessons: ordered,
    order,
    progress: readProgress(root)
  };
}

export type LessonEntry = ReturnType<typeof readIndex>["lessons"][number];

export function findLesson({ root, id }: {
  root: string;
  id: string;
}) {
  return readIndex(root).lessons.find(lesson => lesson.id === id);
}

export function isLessonPassed({ root, id }: {
  root: string;
  id: string;
}) {
  return isPassed({
    id,
    progress: readProgress(root)
  });
}

export function findNextLesson(root: string) {
  const { lessons, order, progress } = readCourse(root);
  const nextId = nextUnpassedId({
    order,
    progress
  });
  return lessons.find(lesson => lesson.id === nextId);
}
