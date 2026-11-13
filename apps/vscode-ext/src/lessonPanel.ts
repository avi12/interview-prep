import {
  nextLessonScript,
  PanelAction,
  type PanelCommand,
  panelMessageSchema,
  PASSED_SCRIPT,
  SCROLL_TO_TOP_SCRIPT,
  VIEWING_SCRIPT
} from "@scripts/lib/panel.ts";
import * as vscode from "vscode";

import type { LessonEntry } from "@/courseHost.ts";

const VIEW_TYPE = "interviewPrep.lesson";
const BODY_END = "</body>";

function panelHtml({
  page,
  isPassed,
  isScrolledToTop,
  nextName,
  narrationRuntimeUrl
}: {
  page: string;
  narrationRuntimeUrl: string | undefined;
  isPassed: boolean;
  isScrolledToTop: boolean;
  nextName: string | undefined;
}) {
  const scripts = [
    VIEWING_SCRIPT,
    isPassed ? PASSED_SCRIPT : "",
    isScrolledToTop ? SCROLL_TO_TOP_SCRIPT : "",
    nextName ? nextLessonScript(nextName) : ""
  ].join("\n");
  const openedAt = isScrolledToTop ? `<!-- opened ${Date.now()} -->` : "";
  const narrationRuntime =
    narrationRuntimeUrl === undefined ? "" : `<script src="${narrationRuntimeUrl}" defer></script>`;
  return page.replace(BODY_END, `<script>${scripts}</script>${narrationRuntime}${openedAt}${BODY_END}`);
}

let panel: vscode.WebviewPanel | undefined;
let messageSubscription: vscode.Disposable | undefined;
let viewingSection = "";

export function closeLessonPanel() {
  messageSubscription?.dispose();
  panel?.dispose();
}

export function lessonPanelState() {
  return {
    isActive: panel?.active ?? false,
    section: viewingSection
  };
}

export function showLesson({
  page,
  lesson,
  viewColumn,
  isPassed,
  isScrolledToTop,
  nextName,
  onAction,
  onOpenFile,
  narrationRuntimeUrl
}: {
  page: string;
  lesson: LessonEntry;
  viewColumn: vscode.ViewColumn;
  isPassed: boolean;
  isScrolledToTop: boolean;
  nextName: string | undefined;
  onAction: (action: PanelCommand) => void;
  onOpenFile: (file: string) => void;
  narrationRuntimeUrl: string | undefined;
}) {
  const html = panelHtml({
    page,
    isPassed,
    isScrolledToTop,
    nextName,
    narrationRuntimeUrl
  });
  if (!panel) {
    panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      lesson.title,
      {
        viewColumn,
        preserveFocus: true
      },
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
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
    if (message.action === PanelAction.VIEWING) {
      viewingSection = message.section;
      return;
    }

    if (message.action === PanelAction.OPEN_FILE) {
      return onOpenFile(message.file);
    }

    onAction(message.action);
  });
}
