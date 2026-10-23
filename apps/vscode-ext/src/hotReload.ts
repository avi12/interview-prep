import { INDEX_RELATIVE_PATH } from "@scripts/lib/layout.ts";
import { relative, resolve } from "node:path";
import * as vscode from "vscode";

const DEBOUNCE_MS = 300;
const EXTENSION_BUNDLE_RELATIVE_PATH = "dist/extension.js";
const RESTART_EXTENSION_HOST_COMMAND = "workbench.action.restartExtensionHost";

function onFileChanged({ base, path, handler }: {
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
  return watcher;
}

export function watchForChanges({ root, extensionPath, onLessonsChanged }: {
  root: string;
  extensionPath: string;
  onLessonsChanged: () => void;
}) {
  const isEnabled = vscode.workspace.getConfiguration("interviewPrep").get<boolean>("hotReload", false);
  if (!isEnabled) {
    return [];
  }

  return [
    onFileChanged({
      base: root,
      path: INDEX_RELATIVE_PATH,
      handler: onLessonsChanged
    }),
    onFileChanged({
      base: extensionPath,
      path: EXTENSION_BUNDLE_RELATIVE_PATH,
      handler: () => vscode.commands.executeCommand(RESTART_EXTENSION_HOST_COMMAND)
    })
  ];
}
