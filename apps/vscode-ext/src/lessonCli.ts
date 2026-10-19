import { spawn } from "node:child_process";
import * as vscode from "vscode";
import { LESSON_CLI_RELATIVE_PATH } from "@scripts/lib/layout.ts";

const TASK_TYPE = "interviewPrep";
const TASK_SOURCE = "interview-prep";
const OPEN_OUTPUT_FILE_PATTERN = /^ {2}(.+)$/gm;

export const runLessonCli = ({ root, args }: { root: string; args: string[] }) =>
  new Promise<string>((resolveOutput, rejectOutput) => {
    const child = spawn("node", [LESSON_CLI_RELATIVE_PATH, ...args], { cwd: root, shell: process.platform === "win32" });
    let output = "";
    child.stdout.on("data", chunk => (output += chunk));
    child.stderr.on("data", chunk => (output += chunk));
    child.on("error", rejectOutput);
    child.on("exit", () => resolveOutput(output));
  });

export const ensureExerciseFiles = async ({ root, id }: { root: string; id: string }) => {
  const output = await runLessonCli({ root, args: ["open", id] });
  return [...output.matchAll(OPEN_OUTPUT_FILE_PATTERN)].map(match => match[1].trim());
};

export const runTestsInTerminal = async ({ root, id }: { root: string; id: string }) => {
  const execution = new vscode.ShellExecution("node", [LESSON_CLI_RELATIVE_PATH, "test", id], { cwd: root });
  const task = new vscode.Task({ type: TASK_TYPE, lesson: id }, vscode.TaskScope.Workspace, `Tests: ${id}`, TASK_SOURCE, execution);
  task.presentationOptions = { reveal: vscode.TaskRevealKind.Always, clear: true, focus: false, panel: vscode.TaskPanelKind.Dedicated };
  await vscode.tasks.executeTask(task);
};

export const onTestsFinished = (handler: (result: { id: string; isPass: boolean }) => void) =>
  vscode.tasks.onDidEndTaskProcess(e => {
    const { definition } = e.execution.task;
    if (definition.type !== TASK_TYPE) return;
    handler({ id: String(definition.lesson), isPass: e.exitCode === 0 });
  });
