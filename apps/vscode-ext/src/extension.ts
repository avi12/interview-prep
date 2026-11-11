import { activateCourse } from "@/activateCourse.ts";
import { createLocalFeatures } from "@/localFeatures.ts";
import { createNodeCourseHost } from "@/nodeHost.ts";
import { ELEMENTS_BUNDLE_RELATIVE_PATH } from "@/webview/bundlePath.ts";
import { join } from "node:path";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext, { isHotSwap }: { isHotSwap: boolean }) {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    return;
  }

  const host = createNodeCourseHost({
    root,
    elementsBundlePath: join(context.extensionPath, ELEMENTS_BUNDLE_RELATIVE_PATH),
    local: createLocalFeatures({
      context,
      root
    })
  });
  void activateCourse({
    context,
    host,
    isHotSwap
  });
}
