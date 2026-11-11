import { activateCourse } from "@/activateCourse.ts";
import type { CourseContext } from "@/courseHost.ts";
import { disposeAll } from "@/disposables.ts";
import { type KeyValueStorage, StorageMemento } from "@/storageMemento.ts";
import { createWebCourseHost, type WebHostDependencies } from "@/webHost.ts";
import * as vscode from "vscode";

export { WEB_EXTENSION_MANIFEST } from "@/webManifest.ts";

export type WebCourseDependencies = WebHostDependencies & {
  storage: KeyValueStorage;
};

const StorageKey = {
  global: "interviewPrep.globalState",
  workspace: "interviewPrep.workspaceState"
} as const;

export async function activateWeb({ storage, ...dependencies }: WebCourseDependencies) {
  const subscriptions: vscode.Disposable[] = [];
  const context: CourseContext = {
    subscriptions,
    globalState: new StorageMemento({
      storage,
      storageKey: StorageKey.global
    }),
    workspaceState: new StorageMemento({
      storage,
      storageKey: StorageKey.workspace
    })
  };
  await activateCourse({
    context,
    host: createWebCourseHost(dependencies),
    isHotSwap: false
  });
  return new vscode.Disposable(() => disposeAll(subscriptions));
}
