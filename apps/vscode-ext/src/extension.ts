import { relative, resolve, sep } from "node:path";
import * as vscode from "vscode";
import { LESSON_ID_SEGMENTS, WORK_DIR_NAME } from "@scripts/lib/layout.ts";
import { DONE_COMMAND, PanelAction } from "@scripts/lib/panel.ts";
import { watchForChanges } from "@/hotReload.ts";
import { findLesson, findNextLesson } from "@/lessonData.ts";
import { ensureExerciseFiles, onTestsFinished, runLessonCli, runTestsInTerminal } from "@/lessonCli.ts";
import { showLesson } from "@/lessonPanel.ts";
import { Command, LessonTree } from "@/lessonTree.ts";

const CLAUDE_TERMINAL_NAME = "Claude tutor";

const lessonIdOfFile = ({ root, file }: { root: string; file: string }) => {
  const segments = relative(resolve(root, WORK_DIR_NAME), file).split(sep);
  const isInsideWork = !segments[0].startsWith("..");
  return isInsideWork && segments.length > LESSON_ID_SEGMENTS ? segments.slice(0, LESSON_ID_SEGMENTS).join("/") : undefined;
};

export function activate(context: vscode.ExtensionContext) {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) return;

  const tree = new LessonTree(root);
  let openLessonId: string | undefined;

  const openExercise = async (id: string) => {
    const files = await ensureExerciseFiles({ root, id });
    if (files.length === 0) return;
    await vscode.window.showTextDocument(vscode.Uri.file(files[0]), { viewColumn: vscode.ViewColumn.One, preview: false });
  };

  const runTests = async (id: string | undefined) => {
    if (!id) return vscode.window.showInformationMessage("Open a lesson or one of your exercise files first");
    await runTestsInTerminal({ root, id });
  };

  const resetExercise = async (id: string | undefined) => {
    if (!id) return;
    const answer = await vscode.window.showWarningMessage(`Reset your code for ${id} to the starter?`, { modal: true }, "Reset");
    if (answer !== "Reset") return;
    await runLessonCli({ root, args: ["reset", id] });
    await openExercise(id);
  };

  const markDone = async (id: string | undefined) => {
    if (!id) return vscode.window.showInformationMessage("Open a lesson first");
    await runLessonCli({ root, args: [DONE_COMMAND, id] });
    tree.refresh();
    await openNextLesson();
  };

  const showLessonPanel = (id: string) => {
    const lesson = findLesson({ root, id });
    if (!lesson) return vscode.window.showErrorMessage(`No lesson ${id}. Run: pnpm build`);
    showLesson({
      root,
      lesson,
      viewColumn: lesson.hasExercise ? vscode.ViewColumn.Two : vscode.ViewColumn.One,
      onAction: action => {
        if (action === PanelAction.runTests) runTests(id);
        if (action === PanelAction.openExercise) openExercise(id);
        if (action === PanelAction.resetExercise) resetExercise(id);
        if (action === PanelAction.markDone) markDone(id);
      }
    });
  };

  const openLesson = async (id: string) => {
    const lesson = findLesson({ root, id });
    if (!lesson) return showLessonPanel(id);
    openLessonId = id;
    if (lesson.hasExercise) await openExercise(id);
    showLessonPanel(id);
  };

  const openNextLesson = async () => {
    const next = findNextLesson(root);
    if (!next) return vscode.window.showInformationMessage("Every lesson is passed. Nice.");
    await openLesson(next.id);
  };

  const activeLessonId = () => {
    const file = vscode.window.activeTextEditor?.document.uri.fsPath;
    return (file && lessonIdOfFile({ root, file })) ?? openLessonId;
  };

  const askClaude = () => {
    const terminal = vscode.window.terminals.find(t => t.name === CLAUDE_TERMINAL_NAME) ?? vscode.window.createTerminal({ name: CLAUDE_TERMINAL_NAME, cwd: root });
    terminal.show();
    const lessonHint = activeLessonId() ? ` The lesson I have open is ${activeLessonId()}.` : "";
    terminal.sendText(`claude "/tutor${lessonHint}"`);
  };

  context.subscriptions.push(
    vscode.window.createTreeView("interviewPrep.lessons", { treeDataProvider: tree }),
    vscode.commands.registerCommand(Command.openLesson, openLesson),
    vscode.commands.registerCommand(Command.nextLesson, openNextLesson),
    vscode.commands.registerCommand(Command.runTests, (uri?: vscode.Uri) => runTests((uri && lessonIdOfFile({ root, file: uri.fsPath })) ?? activeLessonId())),
    vscode.commands.registerCommand(Command.resetExercise, () => resetExercise(activeLessonId())),
    vscode.commands.registerCommand(Command.markDone, () => markDone(activeLessonId())),
    vscode.commands.registerCommand(Command.askClaude, askClaude),
    vscode.commands.registerCommand(Command.refresh, () => tree.refresh()),
    ...watchForChanges({
      root,
      extensionPath: context.extensionPath,
      onLessonsChanged: () => {
        tree.refresh();
        if (openLessonId) showLessonPanel(openLessonId);
      }
    }),
    vscode.workspace.onDidChangeConfiguration(e => e.affectsConfiguration("interviewPrep.role") && tree.refresh()),
    onTestsFinished(({ id, isPass }) => {
      tree.refresh();
      if (!isPass) return;
      vscode.window.showInformationMessage(`Passed ${id}`, "Next lesson").then(choice => choice && openNextLesson());
    })
  );

  const isAutoOpenEnabled = vscode.workspace.getConfiguration("interviewPrep").get<boolean>("autoOpenNextLesson", true);
  if (isAutoOpenEnabled) openNextLesson();
}
