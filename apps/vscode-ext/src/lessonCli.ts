import { LESSON_CLI_RELATIVE_PATH, NO_RESULT_TABLE_FLAG } from "@scripts/lib/layout.ts";
import { spawn } from "node:child_process";
import * as vscode from "vscode";

const TASK_TYPE = "interviewPrep";
export const TASK_SOURCE = "interview-prep";
const TEST_TERMINAL_GROUP = "interviewPrepTests";
const OPEN_OUTPUT_FILE_PATTERN = /^ {2}(.+)$/gm;

export function runLessonCli({ root, args }: {
  root: string;
  args: string[];
}) {
  return new Promise<string>((resolveOutput, rejectOutput) => {
    const child = spawn("node", [LESSON_CLI_RELATIVE_PATH, ...args], {
      cwd: root,
      shell: process.platform === "win32"
    });
    let output = "";
    child.stdout.on("data", chunk => (output += chunk));
    child.stderr.on("data", chunk => (output += chunk));
    child.on("error", rejectOutput);
    child.on("exit", () => resolveOutput(output));
  });
}

export async function ensureExerciseFiles({ root, id }: {
  root: string;
  id: string;
}) {
  const output = await runLessonCli({
    root,
    args: ["open", id]
  });
  return [...output.matchAll(OPEN_OUTPUT_FILE_PATTERN)].map(match => match[1].trim());
}

export function besideTestsPresentation() {
  return {
    reveal: vscode.TaskRevealKind.Always,
    clear: true,
    focus: false,
    panel: vscode.TaskPanelKind.Dedicated,
    group: TEST_TERMINAL_GROUP
  };
}

export async function runTestsInTerminal({ root, id }: {
  root: string;
  id: string;
}) {
  const execution = new vscode.ShellExecution("node", [LESSON_CLI_RELATIVE_PATH, "test", id, NO_RESULT_TABLE_FLAG], { cwd: root });
  const task = new vscode.Task({
    type: TASK_TYPE,
    lesson: id
  }, vscode.TaskScope.Workspace, `Tests: ${id}`, TASK_SOURCE, execution);
  task.presentationOptions = besideTestsPresentation();
  await vscode.tasks.executeTask(task);
}

export function onTestsFinished(handler: (result: {
  id: string;
  isPass: boolean;
}) => void) {
  return vscode.tasks.onDidEndTaskProcess(e => {
    const { definition } = e.execution.task;
    if (definition.type !== TASK_TYPE) {
      return;
    }

    handler({
      id: String(definition.lesson),
      isPass: e.exitCode === 0
    });
  });
}
