import { INDEX_RELATIVE_PATH } from "@scripts/lib/layout.ts";
import { relative, resolve } from "node:path";
import * as vscode from "vscode";

const DEBOUNCE_MS = 300;

export function isHotReloadEnabled() {
  return vscode.workspace.getConfiguration("interviewPrep").get<boolean>("hotReload", false);
}

export function onFileChanged({ base, path, handler }: {
  base: string;
  path: string;
  handler: () => void;
}) {
  const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(base), relative(base, resolve(base, path)).replaceAll("\\", "/")));
  let timer: NodeJS.Timeout | undefined;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(handler, DEBOUNCE_MS);
  }
  watcher.onDidChange(schedule);
  watcher.onDidCreate(schedule);
  return new vscode.Disposable(() => {
    clearTimeout(timer);
    watcher.dispose();
  });
}

export function watchLessons({ root, onLessonsChanged }: {
  root: string;
  onLessonsChanged: () => void;
}) {
  if (!isHotReloadEnabled()) {
    return [];
  }

  return [
    onFileChanged({
      base: root,
      path: INDEX_RELATIVE_PATH,
      handler: onLessonsChanged
    })
  ];
}
