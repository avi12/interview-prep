import { createRequire } from "node:module";
import { resolve } from "node:path";

import * as vscode from "vscode";

import { disposeAll } from "@/disposables.ts";
import { isHotReloadEnabled, onFileChanged } from "@/hotReload.ts";

const APP_BUNDLE_RELATIVE_PATH = "dist/app.js";
const MANIFEST_RELATIVE_PATH = "package.json";
const RELOAD_WINDOW_COMMAND = "workbench.action.reloadWindow";
const SWAPPED_MESSAGE = "$(sync) Interview Prep updated";
const SWAPPED_MESSAGE_MS = 2500;

interface App {
  activate: (context: vscode.ExtensionContext, options: { isHotSwap: boolean }) => void;
}

function appContext(context: vscode.ExtensionContext) {
  const subscriptions: vscode.Disposable[] = [];
  const scoped: vscode.ExtensionContext = Object.create(context, {
    subscriptions: {
      value: subscriptions
    }
  });
  return {
    scoped,
    dispose: () => disposeAll(subscriptions)
  };
}

export function activate(context: vscode.ExtensionContext) {
  const appPath = resolve(context.extensionPath, APP_BUNDLE_RELATIVE_PATH);
  const requireApp = createRequire(appPath);

  function start(isHotSwap: boolean) {
    const running = appContext(context);
    delete requireApp.cache[appPath];
    const app: App = requireApp(appPath);
    app.activate(running.scoped, { isHotSwap });
    return running;
  }

  let running = start(false);
  context.subscriptions.push({ dispose: () => running.dispose() });

  if (!isHotReloadEnabled()) {
    return;
  }

  context.subscriptions.push(
    onFileChanged({
      base: context.extensionPath,
      path: APP_BUNDLE_RELATIVE_PATH,
      handler() {
        running.dispose();
        running = start(true);
        vscode.window.setStatusBarMessage(SWAPPED_MESSAGE, SWAPPED_MESSAGE_MS);
      }
    }),
    onFileChanged({
      base: context.extensionPath,
      path: MANIFEST_RELATIVE_PATH,
      handler: () => vscode.commands.executeCommand(RELOAD_WINDOW_COMMAND)
    })
  );
}
