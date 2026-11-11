import { LESSON_ID_SEGMENTS, WORK_DIR_NAME } from "@scripts/lib/layout.ts";
import * as vscode from "vscode";

const PATH_SEPARATOR = "/";

function lessonIdOfPath({ workPath, path }: {
  workPath: string;
  path: string;
}) {
  const prefix = `${workPath}${PATH_SEPARATOR}`.toLowerCase();
  if (!path.toLowerCase().startsWith(prefix)) {
    return undefined;
  }

  const segments = path.slice(prefix.length).split(PATH_SEPARATOR);
  return segments.length > LESSON_ID_SEGMENTS ? segments.slice(0, LESSON_ID_SEGMENTS).join(PATH_SEPARATOR) : undefined;
}

export function lessonWorkUri({ root, lessonId }: {
  root: vscode.Uri;
  lessonId: string;
}) {
  return vscode.Uri.joinPath(root, WORK_DIR_NAME, lessonId);
}

export function workFileUris({ root, lessonId, files }: {
  root: vscode.Uri;
  lessonId: string;
  files: readonly string[];
}) {
  const workDir = lessonWorkUri({
    root,
    lessonId
  });
  return files.map(file => vscode.Uri.joinPath(workDir, file));
}

export function lessonIdOfUri({ root, uri }: {
  root: vscode.Uri;
  uri: vscode.Uri;
}) {
  if (uri.scheme !== root.scheme) {
    return undefined;
  }

  return lessonIdOfPath({
    workPath: vscode.Uri.joinPath(root, WORK_DIR_NAME).path,
    path: uri.path
  });
}
