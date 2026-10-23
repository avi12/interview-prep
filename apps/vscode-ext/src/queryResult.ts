import { besideTestsPresentation, TASK_SOURCE } from "@/lessonCli.ts";
import { findLesson } from "@/lessonData.ts";
import { formatQueryResult, queryResultFileOf, readQueryResults } from "@scripts/lib/query-result.ts";
import { Lang } from "@scripts/lib/schema.ts";
import * as vscode from "vscode";

const RESULT_TASK_TYPE = "interviewPrepResult";
const TERMINAL_LINE_BREAK = "\r\n";
const NO_RESULT_TEXT = "No result table: your query did not run. The test output next to this says why.";

function resultText({ root, id }: {
  root: string;
  id: string;
}) {
  const results = readQueryResults(
    queryResultFileOf({
      root,
      lessonId: id
    })
  );
  return results.length === 0 ? NO_RESULT_TEXT : results.map(formatQueryResult).join("\n").trimStart();
}

function resultTerminal(text: string): vscode.Pseudoterminal {
  const writeEmitter = new vscode.EventEmitter<string>();
  const closeEmitter = new vscode.EventEmitter<number>();
  return {
    onDidWrite: writeEmitter.event,
    onDidClose: closeEmitter.event,
    open() {
      writeEmitter.fire(text.replaceAll("\n", TERMINAL_LINE_BREAK));
      closeEmitter.fire(0);
    },
    close() {}
  };
}

export async function showQueryResult({ root, id }: {
  root: string;
  id: string;
}) {
  if (findLesson({
    root,
    id
  })?.lang !== Lang.sql) {
    return;
  }

  const text = resultText({
    root,
    id
  });
  const task = new vscode.Task({
    type: RESULT_TASK_TYPE,
    lesson: id
  }, vscode.TaskScope.Workspace, `Result: ${id}`, TASK_SOURCE, new vscode.CustomExecution(() => Promise.resolve(resultTerminal(text))));
  task.presentationOptions = {
    ...besideTestsPresentation(),
    echo: false,
    showReuseMessage: false
  };
  await vscode.tasks.executeTask(task);
}
