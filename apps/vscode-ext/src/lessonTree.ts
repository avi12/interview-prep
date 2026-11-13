import { groupByTrack, isPassed, nextUnpassedId } from "@scripts/lib/study.ts";
import * as vscode from "vscode";

import { Command } from "@/contributions.ts";
import type { Course } from "@/course.ts";

export const LessonView = {
  PATH: "path",
  TRACKS: "tracks"
} as const;

type LessonView = (typeof LessonView)[keyof typeof LessonView];

const LESSON_VIEW_KEY = "interviewPrep.lessonView";
const SET_CONTEXT_COMMAND = "setContext";
const CURRENT_LESSON_NOTE = "current";
const NEXT_LESSON_NOTE = "next";

const NodeKind = {
  TRACK: "track",
  LESSON: "lesson"
} as const;

type NodeKind = (typeof NodeKind)[keyof typeof NodeKind];

interface Node {
  kind: NodeKind;
  id: string;
}

function lessonIcon({ isDone, isNext, hasExercise }: { isDone: boolean; isNext: boolean; hasExercise: boolean }) {
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

  private readonly course: Course;
  private readonly currentLessonId: () => string | undefined;
  private readonly state: vscode.Memento;

  constructor({
    course,
    currentLessonId,
    state
  }: {
    course: Course;
    currentLessonId: () => string | undefined;
    state: vscode.Memento;
  }) {
    this.course = course;
    this.currentLessonId = currentLessonId;
    this.state = state;
    void this.announceView();
  }

  refresh() {
    this.changeEmitter.fire();
  }

  async showView(view: LessonView) {
    await this.state.update(LESSON_VIEW_KEY, view);
    await this.announceView();
    this.refresh();
  }

  getChildren(node?: Node) {
    const isPathRoot = !node && this.isPathView();
    if (isPathRoot) {
      return this.course.selected().lessons.map(({ id }) => ({
        kind: NodeKind.LESSON,
        id
      }));
    }

    if (!node) {
      return this.trackGroups().map(({ track }) => ({
        kind: NodeKind.TRACK,
        id: track.id
      }));
    }

    const isLesson = node.kind === NodeKind.LESSON;
    if (isLesson) {
      return [];
    }

    const lessons = this.trackGroup(node.id)?.lessons ?? [];
    return lessons.map(({ id }) => ({
      kind: NodeKind.LESSON,
      id
    }));
  }

  getParent({ kind, id }: Node) {
    const isTrackOrPathNode = kind === NodeKind.TRACK || this.isPathView();
    if (isTrackOrPathNode) {
      return undefined;
    }

    const track = this.course.selected().lessons.find(lesson => lesson.id === id)?.track;
    return track
      ? {
          kind: NodeKind.TRACK,
          id: track
        }
      : undefined;
  }

  lessonNode(id: string) {
    const isListed = this.course.selected().lessons.some(lesson => lesson.id === id);
    return isListed
      ? {
          kind: NodeKind.LESSON,
          id
        }
      : undefined;
  }

  getTreeItem({ kind, id }: Node) {
    return kind === NodeKind.TRACK ? this.trackItem(id) : this.lessonItem(id);
  }

  private view() {
    return this.state.get<LessonView>(LESSON_VIEW_KEY, LessonView.PATH);
  }

  private isPathView() {
    return this.view() === LessonView.PATH;
  }

  private async announceView() {
    await vscode.commands.executeCommand(SET_CONTEXT_COMMAND, LESSON_VIEW_KEY, this.view());
  }

  private trackGroups() {
    const { tracks, lessons } = this.course.selected();
    return groupByTrack({
      tracks,
      lessons
    });
  }

  private trackGroup(id: string) {
    return this.trackGroups().find(({ track }) => track.id === id);
  }

  private trackItem(id: string) {
    const { progress } = this.course.selected();
    const group = this.trackGroup(id);
    const lessons = group?.lessons ?? [];
    function isLessonPassed(lesson: (typeof lessons)[number]) {
      return isPassed({
        progress,
        id: lesson.id
      });
    }
    const passedCount = lessons.filter(isLessonPassed).length;
    const isNextLessonInside = this.course.findNextLesson()?.track === id;
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
    const { lessons, order, progress } = this.course.selected();
    const lesson = lessons.find(candidate => candidate.id === id);
    const isDone = isPassed({
      progress,
      id
    });
    const isNext =
      id ===
      nextUnpassedId({
        order,
        progress
      });
    const isCurrent = id === this.currentLessonId();
    const isPathView = this.isPathView();
    const title = isPathView ? `${order.indexOf(id) + 1}. ${lesson?.title ?? id}` : (lesson?.title ?? id);
    const label = isCurrent
      ? {
          label: title,
          highlights: [[0, title.length] satisfies [number, number]]
        }
      : title;
    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
    item.id = id;
    item.iconPath = new vscode.ThemeIcon(
      lessonIcon({
        isDone,
        isNext,
        hasExercise: !!lesson?.hasExercise
      })
    );
    const progressNote = isNext ? NEXT_LESSON_NOTE : `${lesson?.minutes ?? "?"} min`;
    const isPathLesson = isPathView && lesson;
    const notes = [
      isCurrent ? CURRENT_LESSON_NOTE : "",
      isPathLesson ? this.course.trackTitleOf(lesson) : "",
      progressNote
    ];
    item.description = notes.filter(Boolean).join(" · ");
    item.command = {
      command: Command.OPEN_LESSON,
      title: "Open lesson",
      arguments: [id]
    };
    return item;
  }
}
