import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as vscode from "vscode";
import type { PanelActionName } from "@scripts/lib/panel.ts";
import type { LessonEntry } from "@/lessonData.ts";

const VIEW_TYPE = "interviewPrep.lesson";

let panel: vscode.WebviewPanel | undefined;
let messageSubscription: vscode.Disposable | undefined;

export const showLesson = ({
  root,
  lesson,
  viewColumn,
  onAction
}: {
  root: string;
  lesson: LessonEntry;
  viewColumn: vscode.ViewColumn;
  onAction: (action: PanelActionName) => void;
}) => {
  const html = readFileSync(resolve(root, lesson.html), "utf8");
  if (!panel) {
    panel = vscode.window.createWebviewPanel(VIEW_TYPE, lesson.title, { viewColumn, preserveFocus: true }, { enableScripts: true, retainContextWhenHidden: true });
    panel.onDidDispose(() => (panel = undefined));
  }
  panel.title = lesson.title;
  panel.webview.html = html;
  panel.reveal(viewColumn, true);
  messageSubscription?.dispose();
  messageSubscription = panel.webview.onDidReceiveMessage(({ action }: { action: PanelActionName }) => onAction(action));
};
