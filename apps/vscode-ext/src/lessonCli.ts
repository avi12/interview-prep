import { LESSON_CLI_RELATIVE_PATH, NO_RESULT_TABLE_FLAG } from "@scripts/lib/layout.ts";
import { spawn } from "node:child_process";
import * as vscode from "vscode";

const TASK_TYPE = "interviewPrep";
const TASK_SOURCE = "interview-prep";

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

export async function runTestsInTerminal({ root, id }: {
  root: string;
  id: string;
}) {
  const execution = new vscode.ShellExecution("node", [LESSON_CLI_RELATIVE_PATH, "test", id, NO_RESULT_TABLE_FLAG], { cwd: root });
  const task = new vscode.Task({
    type: TASK_TYPE,
    lesson: id
  }, vscode.TaskScope.Workspace, `Tests: ${id}`, TASK_SOURCE, execution);
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Never,
    clear: true,
    focus: false,
    panel: vscode.TaskPanelKind.Dedicated
  };
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
