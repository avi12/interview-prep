import {
  NARRATION_HOST_SCRIPT,
  type NarrationReply,
  type NarrationRequest,
  narrationRequestSchema
} from "@scripts/lib/narration-host.ts";
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
  nextName
}: {
  page: string;
  isPassed: boolean;
  isScrolledToTop: boolean;
  nextName: string | undefined;
}) {
  const scripts = [
    VIEWING_SCRIPT,
    NARRATION_HOST_SCRIPT,
    isPassed ? PASSED_SCRIPT : "",
    isScrolledToTop ? SCROLL_TO_TOP_SCRIPT : "",
    nextName ? nextLessonScript(nextName) : ""
  ].join("\n");
  const openedAt = isScrolledToTop ? `<!-- opened ${Date.now()} -->` : "";
  return page.replace(BODY_END, `<script>${scripts}</script>${openedAt}${BODY_END}`);
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
  onNarration
}: {
  page: string;
  lesson: LessonEntry;
  viewColumn: vscode.ViewColumn;
  isPassed: boolean;
  isScrolledToTop: boolean;
  nextName: string | undefined;
  onAction: (action: PanelCommand) => void;
  onOpenFile: (file: string) => void;
  onNarration: (request: NarrationRequest) => Promise<NarrationReply>;
}) {
  const html = panelHtml({
    page,
    isPassed,
    isScrolledToTop,
    nextName
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
    const narration = narrationRequestSchema.safeParse(raw);
    if (narration.success) {
      void onNarration(narration.data).then(reply => panel?.webview.postMessage(reply));
      return;
    }

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
