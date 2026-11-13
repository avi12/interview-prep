import { PanelAction } from "@scripts/lib/panel.ts";
import * as vscode from "vscode";

import { addTopic } from "@/addTopic.ts";
import { Command, IS_LOCAL_CONTEXT_KEY } from "@/contributions.ts";
import { COURSE_FILTER_SETTINGS, courseSettings, createCourse } from "@/course.ts";
import type { CourseContext, CourseHost, CourseSession, LessonEntry } from "@/courseHost.ts";
import { closeLessonPanel, showLesson } from "@/lessonPanel.ts";
import { LessonTree, LessonView } from "@/lessonTree.ts";
import { isOnboarded, showOnboarding } from "@/onboardingPanel.ts";
import { registerSqlCompletion } from "@/sqlCompletion.ts";
import { registerSqlHighlight } from "@/sqlHighlight.ts";
import { createTestResultsView } from "@/testResults.ts";
import { createTopicsStatus } from "@/topicsStatus.ts";
import { lessonIdOfUri, workFileUris } from "@/workspaceLayout.ts";

const SHOW_LESSONS_COMMAND = "workbench.view.extension.interviewPrep";
const SET_CONTEXT_COMMAND = "setContext";
const OPEN_LESSON_KEY = "interviewPrep.openLesson";
const AUTO_OPEN_SETTING = "autoOpenNextLesson";
export async function activateCourse({
  context,
  host,
  isHotSwap
}: {
  context: CourseContext;
  host: CourseHost;
  isHotSwap: boolean;
}) {
  const root = host.workspaceRoot;
  const course = createCourse(host);
  await course.refresh();

  let openLessonId: string | undefined;
  const tree = new LessonTree({
    course,
    currentLessonId: () => openLessonId,
    state: context.globalState
  });
  const treeView = vscode.window.createTreeView("interviewPrep.lessons", { treeDataProvider: tree });
  const testResults = createTestResultsView({
    course,
    readTestReport: host.readTestReport
  });
  const topicsStatus = createTopicsStatus(course);

  function lessonIdOf(uri: vscode.Uri) {
    return lessonIdOfUri({
      root,
      uri
    });
  }

  async function refreshCourse() {
    await course.refresh();
    tree.refresh();
    topicsStatus.render();
  }

  async function ensureExercise(lesson: LessonEntry) {
    if (!lesson.hasExercise) {
      return [];
    }

    await host.ensureExerciseFiles(lesson);
    return workFileUris({
      root,
      lessonId: lesson.id,
      files: lesson.files
    });
  }

  async function showExerciseFile(uri: vscode.Uri) {
    function isUriOpenInGroup(group: vscode.TabGroup) {
      return group.tabs.some(
        tab => tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === uri.toString()
      );
    }
    const openGroup = vscode.window.tabGroups.all.find(isUriOpenInGroup);
    await vscode.window.showTextDocument(uri, {
      viewColumn: openGroup?.viewColumn ?? vscode.ViewColumn.One,
      preview: false
    });
  }

  async function openExercise(id: string) {
    const lesson = course.findLesson(id);
    const files = lesson ? await ensureExercise(lesson) : [];
    const [firstFile] = files;
    if (!firstFile) {
      return;
    }

    for (const file of [...files, firstFile]) {
      await showExerciseFile(file);
    }
  }

  async function openExerciseFile({ id, file }: { id: string; file: string }) {
    const lesson = course.findLesson(id);
    if (!lesson) {
      return;
    }

    const uris = await ensureExercise(lesson);
    const uri = uris[lesson.files.indexOf(file)];
    if (uri) {
      await showExerciseFile(uri);
    }
  }

  async function runTests(id: string | undefined) {
    const lesson = id ? course.findLesson(id) : undefined;
    if (!lesson) {
      return vscode.window.showInformationMessage("Open a lesson or one of your exercise files first");
    }

    await host.runTests(lesson);
    await testResults.showRunning(lesson.id);
  }

  async function resetExercise(id: string | undefined) {
    const lesson = id ? course.findLesson(id) : undefined;
    if (!lesson) {
      return;
    }

    const answer = await vscode.window.showWarningMessage(
      `Reset your code for ${lesson.id} to the starter?`,
      { modal: true },
      "Reset"
    );
    if (answer !== "Reset") {
      return;
    }

    await host.resetExercise(lesson);
    await openExercise(lesson.id);
  }

  async function markDone(id: string | undefined) {
    const lesson = id ? course.findLesson(id) : undefined;
    if (!lesson) {
      return vscode.window.showInformationMessage("Open a lesson first");
    }

    await host.markDone(lesson);
    await refreshCourse();
    await openNextLesson();
  }

  async function showLessonPanel({ id, isScrolledToTop }: { id: string; isScrolledToTop: boolean }) {
    const lesson = course.findLesson(id);
    const page = lesson ? await host.readCourseFile(lesson.html) : null;
    const isLessonPageMissing = !lesson || page === null;
    if (isLessonPageMissing) {
      return vscode.window.showErrorMessage(`No lesson ${id}. Run: pnpm build`);
    }

    showLesson({
      page,
      lesson,
      viewColumn: lesson.hasExercise ? vscode.ViewColumn.Two : vscode.ViewColumn.One,
      isPassed: course.isLessonPassed(id),
      isScrolledToTop,
      nextName: course.nextLessonName(id),
      narrationRuntimeUrl: host.narrationRuntimeUrl,
      onOpenFile(file) {
        void openExerciseFile({
          id,
          file
        });
      },
      onAction(action) {
        if (action === PanelAction.RUN_TESTS) {
          void runTests(id);
        }

        if (action === PanelAction.OPEN_EXERCISE) {
          void openExercise(id);
        }

        if (action === PanelAction.RESET_EXERCISE) {
          void resetExercise(id);
        }

        if (action === PanelAction.MARK_DONE) {
          void markDone(id);
        }

        if (action === PanelAction.NEXT_LESSON) {
          void openNextLesson();
        }
      }
    });
  }

  function otherLessonTabs(id: string) {
    const currentFileUris = new Set(
      workFileUris({
        root,
        lessonId: id,
        files: course.findLesson(id)?.files ?? []
      }).map(uri => uri.toString())
    );
    return vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .flatMap(tab => {
        if (!(tab.input instanceof vscode.TabInputText)) {
          return [];
        }

        const tabLessonId = lessonIdOf(tab.input.uri);
        const uri = tab.input.uri.toString();
        const isStale = tabLessonId !== id || !currentFileUris.has(uri);
        const isStaleLessonTab = tabLessonId !== undefined && isStale;
        return isStaleLessonTab
          ? [
              {
                tab,
                uri
              }
            ]
          : [];
      });
  }

  async function closeOtherLessonTabs(id: string) {
    const tabs = otherLessonTabs(id);
    const uris = new Set(tabs.map(({ uri }) => uri));
    const dirtyDocuments = vscode.workspace.textDocuments.filter(
      document => document.isDirty && uris.has(document.uri.toString())
    );
    await Promise.all(dirtyDocuments.map(document => document.save()));
    await vscode.window.tabGroups.close(tabs.map(({ tab }) => tab));
  }

  async function revealCurrentLesson() {
    const node = openLessonId ? tree.lessonNode(openLessonId) : undefined;
    if (!node) {
      return;
    }

    await treeView.reveal(node, {
      select: true,
      focus: false
    });
  }

  async function showLessonWorkspace({ id, isScrolledToTop }: { id: string; isScrolledToTop: boolean }) {
    const lesson = course.findLesson(id);
    if (!lesson) {
      return showLessonPanel({
        id,
        isScrolledToTop
      });
    }

    openLessonId = id;
    host.address?.showLesson(id);
    void context.workspaceState.update(OPEN_LESSON_KEY, id);
    tree.refresh();

    if (lesson.hasExercise) {
      await openExercise(id);
    }

    await closeOtherLessonTabs(id);
    await showLessonPanel({
      id,
      isScrolledToTop
    });
    await revealCurrentLesson();
  }

  function openLesson(id: string) {
    return showLessonWorkspace({
      id,
      isScrolledToTop: true
    });
  }

  function goToCurrentLesson() {
    if (!openLessonId) {
      return openNextLesson();
    }

    return showLessonWorkspace({
      id: openLessonId,
      isScrolledToTop: false
    });
  }

  function openOnboarding() {
    return showOnboarding({
      course,
      state: context.workspaceState,
      readElementsBundle: host.readElementsBundle,
      onAddTopic() {
        void vscode.commands.executeCommand(Command.ADD_TOPIC);
      },
      onFinished() {
        tree.refresh();
        void openNextLesson();
      }
    });
  }

  async function openNextLesson() {
    const next = course.findNextLesson();
    if (!next) {
      return vscode.window.showInformationMessage(
        "That was the last lesson in your topics, and every one is passed. Nice. Add more topics from the status bar to keep going"
      );
    }

    await openLesson(next.id);
  }

  function activeLessonId() {
    const uri = vscode.window.activeTextEditor?.document.uri;
    return (uri && lessonIdOf(uri)) ?? openLessonId;
  }

  function isWorkspaceEditor(editor: vscode.TextEditor | undefined) {
    return editor?.document.uri.scheme === root.scheme;
  }

  function lessonEditor() {
    const active = vscode.window.activeTextEditor;
    const isActiveWorkspaceEditor = active && isWorkspaceEditor(active);
    if (isActiveWorkspaceEditor) {
      return active;
    }

    const id = activeLessonId();
    return vscode.window.visibleTextEditors.find(
      editor => isWorkspaceEditor(editor) && lessonIdOf(editor.document.uri) === id
    );
  }

  function activeLesson() {
    const id = activeLessonId();
    return id ? course.findLesson(id) : undefined;
  }

  function sqlTablesOf(document: vscode.TextDocument) {
    const id = lessonIdOf(document.uri);
    if (!id) {
      return [];
    }

    return course.findLesson(id)?.sqlTables ?? [];
  }

  async function reloadLessons() {
    await refreshCourse();

    if (openLessonId) {
      await closeOtherLessonTabs(openLessonId);
      await showLessonPanel({
        id: openLessonId,
        isScrolledToTop: false
      });
    }
  }

  const session: CourseSession = {
    activeLessonId,
    activeLesson,
    lessonEditor,
    reloadLessons
  };

  void vscode.commands.executeCommand(SET_CONTEXT_COMMAND, IS_LOCAL_CONTEXT_KEY, host.local !== undefined);
  function handleRunTests(uri?: vscode.Uri) {
    return runTests((uri && lessonIdOf(uri)) ?? activeLessonId());
  }

  context.subscriptions.push(
    host,
    treeView,
    topicsStatus,
    testResults.registration,
    registerSqlCompletion(sqlTablesOf),
    registerSqlHighlight(sqlTablesOf),
    vscode.commands.registerCommand(Command.OPEN_LESSON, openLesson),
    vscode.commands.registerCommand(Command.NEXT_LESSON, openNextLesson),
    vscode.commands.registerCommand(Command.GO_TO_CURRENT_LESSON, goToCurrentLesson),
    vscode.commands.registerCommand(Command.CHOOSE_ROLE, course.chooseRole),
    vscode.commands.registerCommand(Command.CHOOSE_TRACKS, openOnboarding),
    vscode.commands.registerCommand(Command.ADD_TOPIC, addTopic),
    vscode.commands.registerCommand(Command.RUN_TESTS, handleRunTests),
    vscode.commands.registerCommand(Command.RESET_EXERCISE, () => resetExercise(activeLessonId())),
    vscode.commands.registerCommand(Command.MARK_DONE, () => markDone(activeLessonId())),
    vscode.commands.registerCommand(Command.REFRESH, refreshCourse),
    vscode.commands.registerCommand(Command.SHOW_PATH, () => tree.showView(LessonView.PATH)),
    vscode.commands.registerCommand(Command.SHOW_TRACKS, () => tree.showView(LessonView.TRACKS)),
    ...(host.local?.register(session) ?? []),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (COURSE_FILTER_SETTINGS.some(setting => event.affectsConfiguration(setting))) {
        tree.refresh();
        topicsStatus.render();
      }
    }),
    host.onDidChangeProgress(() => {
      void refreshCourse();
    }),
    host.onDidFinishTests(async ({ id, isPass }) => {
      await refreshCourse();
      const isOpenLessonPassed = isPass && id === openLessonId;
      if (isOpenLessonPassed) {
        void showLessonPanel({
          id,
          isScrolledToTop: false
        });
      }

      void testResults.show(id);

      if (!isPass) {
        return;
      }

      const passedTitle = course.findLesson(id)?.title ?? id;
      const nextName = course.nextLessonName(id);
      const nextChoice = nextName ? [`Next: ${nextName}`] : [];
      vscode.window
        .showInformationMessage(`Passed ${passedTitle}`, ...nextChoice)
        .then(choice => choice && openNextLesson());
    }),
    new vscode.Disposable(closeLessonPanel)
  );

  if (isHotSwap) {
    openLessonId = context.workspaceState.get<string>(OPEN_LESSON_KEY);
    tree.refresh();

    if (!isOnboarded(context.workspaceState)) {
      await openOnboarding();
      return session;
    }

    if (openLessonId) {
      await showLessonPanel({
        id: openLessonId,
        isScrolledToTop: false
      });
    }

    return session;
  }

  const isAutoOpenEnabled = courseSettings().get<boolean>(AUTO_OPEN_SETTING, true);
  const linkedLessonId = host.address?.initialLessonId();
  const hasLinkedLesson = linkedLessonId && course.findLesson(linkedLessonId);
  if (hasLinkedLesson) {
    void openLesson(linkedLessonId);
  } else if (!isOnboarded(context.workspaceState)) {
    void openOnboarding();
  } else if (isAutoOpenEnabled) {
    void openNextLesson();
  }

  void vscode.commands.executeCommand(SHOW_LESSONS_COMMAND);
  return session;
}
