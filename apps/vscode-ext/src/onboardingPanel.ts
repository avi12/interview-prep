import { OnboardingAction, onboardingMessageSchema, renderOnboarding } from "@scripts/lib/onboarding.ts";
import * as vscode from "vscode";

import type { Course } from "@/course.ts";

const VIEW_TYPE = "interviewPrep.onboarding";
const PANEL_TITLE = "Choose what to learn";
const ONBOARDED_KEY = "interviewPrep.onboarded";

let panel: vscode.WebviewPanel | undefined;

export function isOnboarded(state: vscode.Memento) {
  return state.get<boolean>(ONBOARDED_KEY, false);
}

export async function showOnboarding({
  course,
  state,
  readElementsBundle,
  onAddTopic,
  onFinished
}: {
  course: Course;
  readElementsBundle: () => Promise<string>;
  state: vscode.Memento;
  onAddTopic: () => void;
  onFinished: () => void;
}) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Active);
    return;
  }

  const createdPanel = vscode.window.createWebviewPanel(VIEW_TYPE, PANEL_TITLE, vscode.ViewColumn.Active, {
    enableScripts: true
  });
  panel = createdPanel;
  async function finish({ role, trackIds }: { role?: string; trackIds: readonly string[] }) {
    await course.saveCourseChoice({
      role: role ?? course.courseChoice().role,
      trackIds
    });
    await state.update(ONBOARDED_KEY, true);
    createdPanel.dispose();
    onFinished();
  }

  createdPanel.webview.onDidReceiveMessage((raw: unknown) => {
    const parsed = onboardingMessageSchema.safeParse(raw);
    if (!parsed.success) {
      return;
    }

    const message = parsed.data;
    if (message.action === OnboardingAction.ADD_TOPIC) {
      onAddTopic();
      return;
    }

    if (message.action === OnboardingAction.SKIP) {
      void finish({ trackIds: [] });
      return;
    }

    void finish({
      role: message.role,
      trackIds: message.trackIds
    });
  });
  createdPanel.onDidDispose(() => (panel = undefined));
  const elementsBundle = await readElementsBundle();
  createdPanel.webview.html = renderOnboarding({
    elementsBundle,
    isReturning: isOnboarded(state),
    ...course.courseChoice()
  });
}
