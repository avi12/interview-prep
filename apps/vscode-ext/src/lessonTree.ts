import { findNextLesson, readCourse } from "@/lessonData.ts";
import { groupByTrack, isPassed, nextUnpassedId } from "@scripts/lib/study.ts";
import * as vscode from "vscode";

export const Command = {
  openLesson: "interviewPrep.openLesson",
  nextLesson: "interviewPrep.nextLesson",
  goToCurrentLesson: "interviewPrep.goToCurrentLesson",
  runTests: "interviewPrep.runTests",
  resetExercise: "interviewPrep.resetExercise",
  markDone: "interviewPrep.markDone",
  askClaude: "interviewPrep.askClaude",
  chooseRole: "interviewPrep.chooseRole",
  refresh: "interviewPrep.refresh"
} as const;

const CURRENT_LESSON_NOTE = "current";

const NodeKind = {
  track: "track",
  lesson: "lesson"
} as const;

type NodeKind = (typeof NodeKind)[keyof typeof NodeKind];

type Node = {
  kind: NodeKind;
  id: string;
};

function lessonIcon({ isDone, isNext, hasExercise }: {
  isDone: boolean;
  isNext: boolean;
  hasExercise: boolean;
}) {
  if (isDone) {
    return "pass-filled";
  }

  if (isNext) {
    return "arrow-circle-right";
  }

  return hasExercise ? "circle-large-outline" : "book";
}

export class LessonTree implements vscode.TreeDataProvider<Node> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  private readonly root: string;
  private readonly currentLessonId: () => string | undefined;

  constructor({ root, currentLessonId }: {
    root: string;
    currentLessonId: () => string | undefined;
  }) {
    this.root = root;
    this.currentLessonId = currentLessonId;
  }

  refresh() {
    this.changeEmitter.fire();
  }

  getChildren(node?: Node) {
    if (!node) {
      return this.trackGroups().map(({ track }): Node => ({
        kind: NodeKind.track,
        id: track.id
      }));
    }

    const isLesson = node.kind === NodeKind.lesson;
    if (isLesson) {
      return [];
    }

    const lessons = this.trackGroup(node.id)?.lessons ?? [];
    return lessons.map(({ id }): Node => ({
      kind: NodeKind.lesson,
      id
    }));
  }

  getParent({ kind, id }: Node) {
    if (kind === NodeKind.track) {
      return undefined;
    }

    const track = readCourse(this.root).lessons.find(lesson => lesson.id === id)?.track;
    return track ? {
      kind: NodeKind.track,
      id: track
    } : undefined;
  }

  lessonNode(id: string) {
    const isListed = readCourse(this.root).lessons.some(lesson => lesson.id === id);
    return isListed ? {
      kind: NodeKind.lesson,
      id
    } : undefined;
  }

  getTreeItem({ kind, id }: Node) {
    return kind === NodeKind.track ? this.trackItem(id) : this.lessonItem(id);
  }

  private trackGroups() {
    const { tracks, lessons } = readCourse(this.root);
    return groupByTrack({
      tracks,
      lessons
    });
  }

  private trackGroup(id: string) {
    return this.trackGroups().find(({ track }) => track.id === id);
  }

  private trackItem(id: string) {
    const { progress } = readCourse(this.root);
    const group = this.trackGroup(id);
    const lessons = group?.lessons ?? [];
    const passedCount = lessons.filter(lesson => isPassed({
      progress,
      id: lesson.id
    })).length;
    const isNextLessonInside = findNextLesson(this.root)?.track === id;
    const collapsibleState = isNextLessonInside
      ? vscode.TreeItemCollapsibleState.Expanded
      : vscode.TreeItemCollapsibleState.Collapsed;
    const idPerCollapsibleState = `${id}/${collapsibleState}`;
    const item = new vscode.TreeItem(group?.track.title ?? id, collapsibleState);
    item.id = idPerCollapsibleState;
    item.description = `${passedCount}/${lessons.length}`;
    return item;
  }

  private lessonItem(id: string) {
    const { lessons, order, progress } = readCourse(this.root);
    const lesson = lessons.find(candidate => candidate.id === id);
    const isDone = isPassed({
      progress,
      id
    });
    const isNext = id === nextUnpassedId({
      order,
      progress
    });
    const isCurrent = id === this.currentLessonId();
    const title = lesson?.title ?? id;
    const label = isCurrent ? {
      label: title,
      highlights: [[0, title.length] satisfies [number, number]]
    } : title;
    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
    item.id = id;
    item.iconPath = new vscode.ThemeIcon(lessonIcon({
      isDone,
      isNext,
      hasExercise: !!lesson?.hasExercise
    }));
    const progressNote = isNext ? "next" : `${lesson?.minutes ?? "?"} min`;
    item.description = isCurrent ? `${CURRENT_LESSON_NOTE} · ${progressNote}` : progressNote;
    item.command = {
      command: Command.openLesson,
      title: "Open lesson",
      arguments: [id]
    };
    return item;
  }
}
