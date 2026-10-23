import { watchForChanges } from "@/hotReload.ts";
import { ensureExerciseFiles, onTestsFinished, runLessonCli, runTestsInTerminal } from "@/lessonCli.ts";
import { findLesson, findNextLesson, isLessonPassed } from "@/lessonData.ts";
import { showLesson } from "@/lessonPanel.ts";
import { Command, LessonTree } from "@/lessonTree.ts";
import { showQueryResult } from "@/queryResult.ts";
import { registerSqlCompletion } from "@/sqlCompletion.ts";
import { registerSqlHighlight } from "@/sqlHighlight.ts";
import { serveTutorView } from "@/tutorView.ts";
import { LESSON_ID_SEGMENTS, WORK_DIR_NAME } from "@scripts/lib/layout.ts";
import { DONE_COMMAND, PanelAction } from "@scripts/lib/panel.ts";
import { relative, resolve, sep } from "node:path";
import * as vscode from "vscode";

const CLAUDE_TERMINAL_NAME = "Claude tutor";
const SHOW_LESSONS_COMMAND = "workbench.view.extension.interviewPrep";
const FILE_SCHEME = "file";

function lessonIdOfFile({ root, file }: {
  root: string;
  file: string;
}) {
  const segments = relative(resolve(root, WORK_DIR_NAME), file).split(sep);
  const isInsideWork = !segments[0].startsWith("..");
  return isInsideWork && segments.length > LESSON_ID_SEGMENTS ? segments.slice(0, LESSON_ID_SEGMENTS).join("/") : undefined;
}

function activateIn({ context, root }: {
  context: vscode.ExtensionContext;
  root: string;
}) {
  const tree = new LessonTree(root);
  let openLessonId: string | undefined;

  async function openExercise(id: string) {
    const files = await ensureExerciseFiles({
      root,
      id
    });
    if (files.length === 0) {
      return;
    }

    await vscode.window.showTextDocument(vscode.Uri.file(files[0]), {
      viewColumn: vscode.ViewColumn.One,
      preview: false
    });
  }

  async function runTests(id: string | undefined) {
    if (!id) {
      return vscode.window.showInformationMessage("Open a lesson or one of your exercise files first");
    }

    await runTestsInTerminal({
      root,
      id
    });
  }

  async function resetExercise(id: string | undefined) {
    if (!id) {
      return;
    }

    const answer = await vscode.window.showWarningMessage(`Reset your code for ${id} to the starter?`, { modal: true }, "Reset");
    if (answer !== "Reset") {
      return;
    }

    await runLessonCli({
      root,
      args: ["reset", id]
    });
    await openExercise(id);
  }

  async function markDone(id: string | undefined) {
    if (!id) {
      return vscode.window.showInformationMessage("Open a lesson first");
    }

    await runLessonCli({
      root,
      args: [DONE_COMMAND, id]
    });
    tree.refresh();
    await openNextLesson();
  }

  function showLessonPanel({ id, isScrolledToTop }: {
    id: string;
    isScrolledToTop: boolean;
  }) {
    const lesson = findLesson({
      root,
      id
    });
    if (!lesson) {
      return vscode.window.showErrorMessage(`No lesson ${id}. Run: pnpm build`);
    }

    showLesson({
      root,
      lesson,
      viewColumn: lesson.hasExercise ? vscode.ViewColumn.Two : vscode.ViewColumn.One,
      isPassed: isLessonPassed({
        root,
        id
      }),
      isScrolledToTop,
      onAction(action) {
        if (action === PanelAction.runTests) {
          void runTests(id);
        }

        if (action === PanelAction.openExercise) {
          void openExercise(id);
        }

        if (action === PanelAction.resetExercise) {
          void resetExercise(id);
        }

        if (action === PanelAction.markDone) {
          void markDone(id);
        }

        if (action === PanelAction.nextLesson) {
          void openNextLesson();
        }
      }
    });
  }

  async function openLesson(id: string) {
    const lesson = findLesson({
      root,
      id
    });
    if (!lesson) {
      return showLessonPanel({
        id,
        isScrolledToTop: true
      });
    }

    openLessonId = id;

    if (lesson.hasExercise) {
      await openExercise(id);
    }

    showLessonPanel({
      id,
      isScrolledToTop: true
    });
  }

  async function openNextLesson() {
    const next = findNextLesson(root);
    if (!next) {
      return vscode.window.showInformationMessage("Every lesson is passed. Nice.");
    }

    await openLesson(next.id);
  }

  function activeLessonId() {
    const file = vscode.window.activeTextEditor?.document.uri.fsPath;
    return (file && lessonIdOfFile({
      root,
      file
    })) ?? openLessonId;
  }

  function isFileEditor(editor: vscode.TextEditor | undefined) {
    return editor?.document.uri.scheme === FILE_SCHEME;
  }

  function lessonEditor() {
    const active = vscode.window.activeTextEditor;
    if (active && isFileEditor(active)) {
      return active;
    }

    const id = activeLessonId();
    return vscode.window.visibleTextEditors.find(editor => isFileEditor(editor) && lessonIdOfFile({
      root,
      file: editor.document.uri.fsPath
    }) === id);
  }

  function activeLesson() {
    const id = activeLessonId();
    return id ? findLesson({
      root,
      id
    }) : undefined;
  }

  function askClaude() {
    const existing = vscode.window.terminals.find(candidate => candidate.name === CLAUDE_TERMINAL_NAME);
    const terminal = existing ?? vscode.window.createTerminal({
      name: CLAUDE_TERMINAL_NAME,
      cwd: root
    });
    terminal.show();
    const lessonHint = activeLessonId() ? ` The lesson I have open is ${activeLessonId()}.` : "";
    terminal.sendText(`claude "/tutor${lessonHint}"`);
  }

  function sqlTablesOf(document: vscode.TextDocument) {
    const id = lessonIdOfFile({
      root,
      file: document.uri.fsPath
    });
    if (!id) {
      return [];
    }

    return findLesson({
      root,
      id
    })?.sqlTables ?? [];
  }

  context.subscriptions.push(
    vscode.window.createTreeView("interviewPrep.lessons", { treeDataProvider: tree }),
    registerSqlCompletion(sqlTablesOf),
    registerSqlHighlight(sqlTablesOf),
    vscode.commands.registerCommand(Command.openLesson, openLesson),
    vscode.commands.registerCommand(Command.nextLesson, openNextLesson),
    vscode.commands.registerCommand(Command.runTests, (uri?: vscode.Uri) => runTests(
      (uri && lessonIdOfFile({
        root,
        file: uri.fsPath
      })) ?? activeLessonId()
    )),
    vscode.commands.registerCommand(Command.resetExercise, () => resetExercise(activeLessonId())),
    vscode.commands.registerCommand(Command.markDone, () => markDone(activeLessonId())),
    vscode.commands.registerCommand(Command.askClaude, askClaude),
    vscode.commands.registerCommand(Command.refresh, () => tree.refresh()),
    serveTutorView({
      root,
      lesson: activeLesson,
      editor: lessonEditor
    }),
    ...watchForChanges({
      root,
      extensionPath: context.extensionPath,
      onLessonsChanged() {
        tree.refresh();

        if (openLessonId) {
          void showLessonPanel({
            id: openLessonId,
            isScrolledToTop: false
          });
        }
      }
    }),
    vscode.workspace.onDidChangeConfiguration(e => e.affectsConfiguration("interviewPrep.role") && tree.refresh()),
    onTestsFinished(({ id, isPass }) => {
      tree.refresh();

      if (isPass && id === openLessonId) {
        void showLessonPanel({
          id,
          isScrolledToTop: false
        });
      }

      void showQueryResult({
        root,
        id
      });

      if (!isPass) {
        return;
      }

      vscode.window.showInformationMessage(`Passed ${id}`, "Next lesson").then(choice => choice && openNextLesson());
    })
  );

  const isAutoOpenEnabled = vscode.workspace.getConfiguration("interviewPrep").get<boolean>("autoOpenNextLesson", true);
  if (isAutoOpenEnabled) {
    void openNextLesson();
  }

  vscode.commands.executeCommand(SHOW_LESSONS_COMMAND);
}

export function activate(context: vscode.ExtensionContext) {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (root) {
    activateIn({
      context,
      root
    });
  }
}
