import {
  createIndexedDBProviders,
  IndexedDB,
  IndexedDBFileSystemProvider,
  registerFileSystemOverlay
} from "@codingame/monaco-vscode-files-service-override";
import * as vscode from "vscode";

export const WORKSPACE_ROOT = vscode.Uri.file("/workspace");

const DATABASE_NAME = "interview-prep-workspace";
const STORE_NAME = "files";
const OVERLAY_PRIORITY = 1;
const IS_WATCH_CROSS_WINDOW = true;

export async function mountWorkspaceFiles() {
  await createIndexedDBProviders();
  const database = await IndexedDB.create(DATABASE_NAME, undefined, [STORE_NAME]);
  const provider = new IndexedDBFileSystemProvider(WORKSPACE_ROOT.scheme, database, STORE_NAME, IS_WATCH_CROSS_WINDOW);
  registerFileSystemOverlay(OVERLAY_PRIORITY, provider);
  const hasRoot = await provider.stat(WORKSPACE_ROOT).then(
    () => true,
    () => false
  );
  if (!hasRoot) {
    await provider.mkdir(WORKSPACE_ROOT);
  }
}
