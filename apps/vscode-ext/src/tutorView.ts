import type { LessonEntry } from "@/lessonData.ts";
import { lessonPanelState } from "@/lessonPanel.ts";
import { readJsonFile } from "@scripts/lib/files.ts";
import { LAST_TEST_RELATIVE_PATH } from "@scripts/lib/layout.ts";
import { lastTestSchema, tutorNotesSchema } from "@scripts/lib/schema.ts";
import { SERVER_HOST, TUTOR_VIEW_PORT } from "@scripts/lib/server.ts";
import {
  TUTOR_VIEW_PATH,
  type TutorBlock,
  tutorHeading,
  tutorParagraph,
  type TutorTestRun,
  type TutorView
} from "@scripts/lib/tutor-view.ts";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { relative, resolve } from "node:path";
import * as vscode from "vscode";

const MAX_CODE_LINES = 400;
const MAX_SELECTION_CHARS = 200;
const MS_PER_MINUTE = 60_000;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};
const NO_LESSON_TITLE = "VS Code";
const VERSION_HASH = "sha1";

interface ViewSources {
  root: string;
  lesson: () => LessonEntry | undefined;
  editor: () => vscode.TextEditor | undefined;
}

function fileName({ root, editor }: {
  root: string;
  editor: vscode.TextEditor;
}) {
  return relative(root, editor.document.uri.fsPath).replaceAll("\\", "/");
}

function nowBlocks({ root, editor }: {
  root: string;
  editor: vscode.TextEditor | undefined;
}) {
  const panel = lessonPanelState();
  if (panel.isActive) {
    return [tutorParagraph(panel.section ? `Reading the lesson, at the part "${panel.section}".` : "Reading the lesson.")];
  }

  if (!editor) {
    return [tutorParagraph("Somewhere else in VS Code, not in the lesson or their file.")];
  }

  const { selection } = editor;
  const selected = editor.document.getText(selection).slice(0, MAX_SELECTION_CHARS);
  const where = `Typing in ${fileName({
    root,
    editor
  })}, cursor on line ${selection.active.line + 1}`;
  return [tutorParagraph(selected ? `${where}, with "${selected}" selected.` : `${where}.`)];
}

function codeBlocks({ root, editor }: {
  root: string;
  editor: vscode.TextEditor | undefined;
}) {
  if (!editor) {
    return [];
  }

  const { document } = editor;
  const cursorLine = editor.selection.active.line;
  const lines = document.getText().split(/\r?\n/).slice(0, MAX_CODE_LINES);
  const numbered = lines.map((line, index) => `${index === cursorLine ? ">" : " "}${index + 1}| ${line}`).join("\n");
  const problems = vscode.languages.getDiagnostics(document.uri).map(({ range, message }) => `line ${range.start.line + 1}: ${message}`);
  return [
    tutorHeading(
      `The learner's file ${fileName({
        root,
        editor
      })}, line numbers on the left, > marks the cursor line`
    ),
    tutorParagraph(numbered || "(the file is empty)"),
    ...(problems.length > 0 ? [tutorHeading("Problems VS Code shows in this file"), tutorParagraph(problems.join("\n"))] : [])
  ];
}

function readLastTest({ root, lessonId }: {
  root: string;
  lessonId: string;
}) {
  const lastTest = readJsonFile({
    path: resolve(root, LAST_TEST_RELATIVE_PATH),
    schema: lastTestSchema.nullable(),
    fallback: null
  });
  return lastTest?.id === lessonId ? lastTest : null;
}

function testBlocks({ root, lessonId }: {
  root: string;
  lessonId: string;
}) {
  const lastTest = readLastTest({
    root,
    lessonId
  });
  if (!lastTest) {
    return [tutorHeading("Tests"), tutorParagraph("The learner has not run the tests for this lesson yet.")];
  }

  const minutesAgo = Math.round((Date.now() - Date.parse(lastTest.at)) / MS_PER_MINUTE);
  const outcome = lastTest.isPass ? "Passed" : "Failed";
  return [tutorHeading(`Last test run: ${outcome}, ${minutesAgo} minutes ago`), tutorParagraph(lastTest.output.trim())];
}

function lessonBlocks({ root, lesson }: {
  root: string;
  lesson: LessonEntry;
}) {
  return [
    ...testBlocks({
      root,
      lessonId: lesson.id
    }),
    ...readJsonFile({
      path: resolve(root, lesson.tutor),
      schema: tutorNotesSchema,
      fallback: []
    })
  ];
}

export function buildTutorView({ root, lesson, editor }: ViewSources): TutorView {
  const currentLesson = lesson();
  const currentEditor = editor();
  const blocks: TutorBlock[] = [
    tutorHeading("What the learner is doing right now"),
    ...nowBlocks({
      root,
      editor: currentEditor
    }),
    ...codeBlocks({
      root,
      editor: currentEditor
    }),
    ...(currentLesson ? lessonBlocks({
      root,
      lesson: currentLesson
    }) : [])
  ];
  const title = currentLesson?.title ?? NO_LESSON_TITLE;
  const lastTest = currentLesson ? readLastTest({
    root,
    lessonId: currentLesson.id
  }) : null;
  const testRun: TutorTestRun | null = lastTest ? {
    ranAt: lastTest.at,
    isPass: lastTest.isPass
  } : null;
  const version = createHash(VERSION_HASH).update(
    JSON.stringify({
      title,
      blocks,
      testRun
    })
  ).digest("hex");
  return {
    version,
    title,
    blocks,
    testRun
  };
}

function viewBody(sources: ViewSources) {
  try {
    return JSON.stringify(buildTutorView(sources));
  } catch {
    return null;
  }
}

export function serveTutorView(sources: ViewSources) {
  const server = createServer((request, response) => {
    if (request.url !== TUTOR_VIEW_PATH) {
      response.writeHead(HTTP_NOT_FOUND).end();
      return;
    }

    const body = viewBody(sources);
    if (!body) {
      response.writeHead(HTTP_SERVER_ERROR).end();
      return;
    }

    response.writeHead(HTTP_OK, JSON_HEADERS).end(body);
  });
  server.on("error", () => server.close());
  server.listen(TUTOR_VIEW_PORT, SERVER_HOST);
  return new vscode.Disposable(() => server.close());
}
