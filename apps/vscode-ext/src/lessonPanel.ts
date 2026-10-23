import type { LessonEntry } from "@/lessonData.ts";
import {
  PanelAction,
  type PanelCommand,
  panelMessageSchema,
  PASSED_SCRIPT,
  SCROLL_TO_TOP_SCRIPT,
  VIEWING_SCRIPT
} from "@scripts/lib/panel.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as vscode from "vscode";

const VIEW_TYPE = "interviewPrep.lesson";
const BODY_END = "</body>";

function panelHtml({ root, lesson, isPassed, isScrolledToTop }: {
  root: string;
  lesson: LessonEntry;
  isPassed: boolean;
  isScrolledToTop: boolean;
}) {
  const scripts = [VIEWING_SCRIPT, isPassed ? PASSED_SCRIPT : "", isScrolledToTop ? SCROLL_TO_TOP_SCRIPT : ""].join("\n");
  const openedAt = isScrolledToTop ? `<!-- opened ${Date.now()} -->` : "";
  return readFileSync(resolve(root, lesson.html), "utf8").replace(BODY_END, `<script>${scripts}</script>${openedAt}${BODY_END}`);
}

let panel: vscode.WebviewPanel | undefined;
let messageSubscription: vscode.Disposable | undefined;
let viewingSection = "";

export function lessonPanelState() {
  return {
    isActive: panel?.active ?? false,
    section: viewingSection
  };
}

export function showLesson({
  root,
  lesson,
  viewColumn,
  isPassed,
  isScrolledToTop,
  onAction
}: {
  root: string;
  lesson: LessonEntry;
  viewColumn: vscode.ViewColumn;
  isPassed: boolean;
  isScrolledToTop: boolean;
  onAction: (action: PanelCommand) => void;
}) {
  const html = panelHtml({
    root,
    lesson,
    isPassed,
    isScrolledToTop
  });
  if (!panel) {
    panel = vscode.window.createWebviewPanel(VIEW_TYPE, lesson.title, {
      viewColumn,
      preserveFocus: true
    }, {
      enableScripts: true,
      retainContextWhenHidden: true
    });
    panel.onDidDispose(() => (panel = undefined));
  }

  panel.title = lesson.title;
  viewingSection = "";
  panel.webview.html = html;
  panel.reveal(viewColumn, true);
  messageSubscription?.dispose();
  messageSubscription = panel.webview.onDidReceiveMessage((raw: unknown) => {
    const parsed = panelMessageSchema.safeParse(raw);
    if (!parsed.success) {
      return;
    }

    const message = parsed.data;
    if (message.action !== PanelAction.viewing) {
      return onAction(message.action);
    }

    viewingSection = message.section;
  });
}
