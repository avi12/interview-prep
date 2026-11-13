import { escapeHtml } from "@scripts/lib/html.ts";
import { queryResultTable } from "@scripts/lib/query-result.ts";
import { Lang } from "@scripts/lib/schema.ts";
import { failedCasesTable } from "@scripts/lib/test-cases.ts";
import * as vscode from "vscode";

import type { Course } from "@/course.ts";
import type { CourseHost, TestReport } from "@/courseHost.ts";

const VIEW_ID = "interviewPrep.testResults";
const FOCUS_VIEW_COMMAND = `${VIEW_ID}.focus`;
const MOVE_VIEWS_COMMAND = "vscode.moveViews";
const RESULTS_CONTAINER_ID = "interviewPrepResults";
const OUTPUT_SUMMARY = "Full test output";
const EMPTY_TEXT =
  "Run your tests, and every failing case shows up here with its input, the expected value and what your code returned.";
const NO_QUERY_RESULT_TEXT = "No result table: your query did not run. The test output says why.";

const STYLE = `
:root { color-scheme: light dark; }
body {
  margin: 0;
  padding: 8px 16px 16px;
  color: var(--vscode-foreground);
  background: var(--vscode-panel-background, var(--vscode-editor-background));
  font: var(--vscode-font-size) var(--vscode-font-family);
}
.summary { margin: 4px 0 12px; font-weight: 600; }
.summary[data-outcome="pass"] { color: var(--vscode-testing-iconPassed); }
.summary[data-outcome="fail"] { color: var(--vscode-testing-iconFailed); }
h2 { margin: 20px 0 8px; font-size: 1em; font-weight: 600; }
table { border-collapse: collapse; width: 100%; }
th, td {
  padding: 4px 10px;
  border: 1px solid var(--vscode-panel-border, var(--vscode-contrastBorder, transparent));
  text-align: start;
  vertical-align: top;
}
th {
  background: var(--vscode-keybindingTable-headerBackground, var(--vscode-editorWidget-background));
  font-weight: 600;
  white-space: nowrap;
}
td { overflow-wrap: anywhere; }
td.value { font-family: var(--vscode-editor-font-family); }
td.number { text-align: end; font-variant-numeric: tabular-nums; }
td[data-column="Expected"] { color: var(--vscode-testing-iconPassed); }
td[data-column="Actual"] { color: var(--vscode-testing-iconFailed); }
tbody tr:hover { background: var(--vscode-list-hoverBackground); }
.count { margin: 6px 0 0; color: var(--vscode-descriptionForeground); }
details { margin-top: 20px; }
summary { cursor: pointer; color: var(--vscode-descriptionForeground); }
pre {
  margin: 8px 0 0;
  padding: 8px 12px;
  overflow-x: auto;
  background: var(--vscode-textCodeBlock-background, var(--vscode-editorWidget-background));
  font-family: var(--vscode-editor-font-family);
  font-size: var(--vscode-editor-font-size);
}
`;

const PROSE_COLUMN = "Test";

function tableHtml({
  columns,
  rows,
  isRightAligned = []
}: {
  columns: string[];
  rows: string[][];
  isRightAligned?: boolean[];
}) {
  const head = columns.map(column => `<th scope="col">${escapeHtml(column)}</th>`).join("");
  const body = rows.map(row => {
    const cells = row.map((cell, index) => {
      const classes = [columns[index] === PROSE_COLUMN ? "" : "value", isRightAligned[index] ? "number" : ""]
        .filter(Boolean)
        .join(" ");
      return `<td class="${classes}" data-column="${escapeHtml(columns[index])}">${escapeHtml(cell)}</td>`;
    });
    return `<tr>${cells.join("")}</tr>`;
  });
  return `<table><thead><tr>${head}</tr></thead><tbody>${body.join("")}</tbody></table>`;
}

function testCasesHtml({ testCases }: TestReport) {
  const { summary, isPass, columns, rows } = failedCasesTable(testCases);
  const heading = `<p class="summary" data-outcome="${isPass ? "pass" : "fail"}">${escapeHtml(summary)}</p>`;
  return isPass
    ? heading
    : `${heading}${tableHtml({
        columns,
        rows
      })}`;
}

function queryResultsHtml({ queryResults: results }: TestReport) {
  if (results.length === 0) {
    return `<p class="count">${escapeHtml(NO_QUERY_RESULT_TEXT)}</p>`;
  }

  return results
    .map(result => {
      const { heading, columns, rows, isRightAligned, countText } = queryResultTable(result);
      const table =
        columns.length === 0
          ? ""
          : tableHtml({
              columns,
              rows,
              isRightAligned
            });
      return `<h2>${escapeHtml(heading)}</h2>${table}<p class="count">${escapeHtml(countText)}</p>`;
    })
    .join("");
}

function pageHtml(body: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>${STYLE}</style>
</head>
<body>${body}</body>
</html>`;
}

export function createTestResultsView({
  course,
  readTestReport
}: {
  course: Course;
  readTestReport: CourseHost["readTestReport"];
}) {
  let view: vscode.WebviewView | undefined;
  let html = pageHtml(`<p class="count">${escapeHtml(EMPTY_TEXT)}</p>`);

  const registration = vscode.window.registerWebviewViewProvider(VIEW_ID, {
    resolveWebviewView(resolved) {
      view = resolved;
      resolved.webview.html = html;
      resolved.onDidDispose(() => (view = undefined));
    }
  });

  async function reveal(body: string) {
    html = pageHtml(body);
    await vscode.commands.executeCommand(MOVE_VIEWS_COMMAND, {
      viewIds: [VIEW_ID],
      destinationId: RESULTS_CONTAINER_ID
    });

    if (!view) {
      await vscode.commands.executeCommand(FOCUS_VIEW_COMMAND);
      return;
    }

    view.webview.html = html;
    view.show(true);
  }

  async function showRunning(id: string) {
    const title = course.findLesson(id)?.title ?? id;
    await reveal(`<p class="summary">${escapeHtml(`Running the tests for ${title}…`)}</p>`);
  }

  async function show(id: string) {
    const lesson = course.findLesson(id);
    if (!lesson?.hasExercise) {
      return;
    }

    const report = await readTestReport(id);
    const cases = testCasesHtml(report);
    const queries = lesson.lang === Lang.SQL ? queryResultsHtml(report) : "";
    const { output } = report;
    const outputDetails = output
      ? `<details><summary>${OUTPUT_SUMMARY}</summary><pre>${escapeHtml(output)}</pre></details>`
      : "";
    await reveal(`${cases}${queries}${outputDetails}`);
  }

  return {
    registration,
    showRunning,
    show
  };
}
