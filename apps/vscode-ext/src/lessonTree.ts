import * as vscode from "vscode";
import { isPassed, lessonsForRole, readIndex, readProgress } from "@/lessonData.ts";

export const Command = {
  openLesson: "interviewPrep.openLesson",
  nextLesson: "interviewPrep.nextLesson",
  runTests: "interviewPrep.runTests",
  resetExercise: "interviewPrep.resetExercise",
  askClaude: "interviewPrep.askClaude",
  refresh: "interviewPrep.refresh"
} as const;

type Node = { kind: "track"; id: string } | { kind: "lesson"; id: string };

export class LessonTree implements vscode.TreeDataProvider<Node> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  refresh() {
    this.changeEmitter.fire();
  }

  getChildren(node?: Node) {
    const { tracks } = readIndex(this.root);
    const lessons = lessonsForRole(this.root);
    if (!node) return tracks.filter(track => lessons.some(l => l.track === track.id)).map((track): Node => ({ kind: "track", id: track.id }));
    if (node.kind === "lesson") return [];
    return lessons.filter(lesson => lesson.track === node.id).map((lesson): Node => ({ kind: "lesson", id: lesson.id }));
  }

  getTreeItem(node: Node) {
    if (node.kind === "track") return this.trackItem(node.id);
    return this.lessonItem(node.id);
  }

  private trackItem(id: string) {
    const { tracks } = readIndex(this.root);
    const lessons = lessonsForRole(this.root);
    const progress = readProgress(this.root);
    const inTrack = lessons.filter(lesson => lesson.track === id);
    const passedCount = inTrack.filter(lesson => isPassed({ progress, id: lesson.id })).length;
    const item = new vscode.TreeItem(tracks.find(track => track.id === id)?.title ?? id, vscode.TreeItemCollapsibleState.Collapsed);
    item.description = `${passedCount}/${inTrack.length}`;
    item.tooltip = tracks.find(track => track.id === id)?.blurb;
    return item;
  }

  private lessonItem(id: string) {
    const lesson = readIndex(this.root).lessons.find(l => l.id === id);
    const isDone = isPassed({ progress: readProgress(this.root), id });
    const item = new vscode.TreeItem(lesson?.title ?? id, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon(isDone ? "pass-filled" : lesson?.hasExercise ? "circle-large-outline" : "book");
    item.description = `${lesson?.minutes ?? "?"} min${lesson?.isNarrated ? " - voice" : ""}`;
    item.command = { command: Command.openLesson, title: "Open lesson", arguments: [id] };
    return item;
  }
}
