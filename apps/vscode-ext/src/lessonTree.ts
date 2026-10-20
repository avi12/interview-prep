import * as vscode from "vscode";
import { isPassed, nextUnpassedId } from "@scripts/lib/study.ts";
import { readCourse } from "@/lessonData.ts";

export const Command = {
  openLesson: "interviewPrep.openLesson",
  nextLesson: "interviewPrep.nextLesson",
  runTests: "interviewPrep.runTests",
  resetExercise: "interviewPrep.resetExercise",
  markDone: "interviewPrep.markDone",
  askClaude: "interviewPrep.askClaude",
  refresh: "interviewPrep.refresh"
} as const;

type Node = { id: string };

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
    if (node) return [];
    return readCourse(this.root).lessons.map(({ id }): Node => ({ id }));
  }

  getTreeItem({ id }: Node) {
    const { lessons, order, progress } = readCourse(this.root);
    const lesson = lessons.find(l => l.id === id);
    const isDone = isPassed({ progress, id });
    const isNext = id === nextUnpassedId({ order, progress });
    const item = new vscode.TreeItem(lesson?.title ?? id, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon(isDone ? "pass-filled" : isNext ? "arrow-circle-right" : lesson?.hasExercise ? "circle-large-outline" : "book");
    item.description = isNext ? "next" : `${lesson?.minutes ?? "?"} min`;
    item.command = { command: Command.openLesson, title: "Open lesson", arguments: [id] };
    return item;
  }
}
