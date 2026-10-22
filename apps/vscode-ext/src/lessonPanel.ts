import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as vscode from "vscode";
import { PanelAction, VIEWING_SCRIPT, type PanelActionName } from "@scripts/lib/panel.ts";
import type { LessonEntry } from "@/lessonData.ts";

const VIEW_TYPE = "interviewPrep.lesson";
const BODY_END = "</body>";

let panel: vscode.WebviewPanel | undefined;
let messageSubscription: vscode.Disposable | undefined;
let viewingSection = "";

export const lessonPanelState = () => ({ isActive: panel?.active ?? false, section: viewingSection });

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
  const html = readFileSync(resolve(root, lesson.html), "utf8").replace(BODY_END, `<script>${VIEWING_SCRIPT}</script>${BODY_END}`);
  if (!panel) {
    panel = vscode.window.createWebviewPanel(VIEW_TYPE, lesson.title, { viewColumn, preserveFocus: true }, { enableScripts: true, retainContextWhenHidden: true });
    panel.onDidDispose(() => (panel = undefined));
  }
  panel.title = lesson.title;
  viewingSection = "";
  panel.webview.html = html;
  panel.reveal(viewColumn, true);
  messageSubscription?.dispose();
  messageSubscription = panel.webview.onDidReceiveMessage(({ action, section }: { action: PanelActionName; section?: string }) => {
    if (action !== PanelAction.viewing) return onAction(action);
    viewingSection = section ?? "";
  });
};
