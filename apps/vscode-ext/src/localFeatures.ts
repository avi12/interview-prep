import * as vscode from "vscode";

import { createApiKeyStore } from "@/apiKey.ts";
import { Command } from "@/contributions.ts";
import type { CourseSession } from "@/courseHost.ts";
import { watchLessons } from "@/hotReload.ts";
import { createNarrationVoices } from "@/narrationVoices.ts";
import { apiKeyRoute } from "@/server/apiKeyRoute.ts";
import { serveRoutes } from "@/server/router.ts";
import { voiceFilesRoute } from "@/server/voiceFiles.ts";
import { voiceSetupRoute } from "@/server/voiceSetupRoute.ts";
import { tutorViewRoute } from "@/tutorView.ts";
import { registerVoiceTutor } from "@/voiceTutor.ts";

const CLAUDE_TERMINAL_NAME = "Claude tutor";

function askClaude({ root, lessonId }: { root: string; lessonId: string | undefined }) {
  const existing = vscode.window.terminals.find(candidate => candidate.name === CLAUDE_TERMINAL_NAME);
  const terminal =
    existing ??
    vscode.window.createTerminal({
      name: CLAUDE_TERMINAL_NAME,
      cwd: root
    });
  terminal.show();
  const lessonHint = lessonId ? ` The lesson I have open is ${lessonId}.` : "";
  terminal.sendText(`claude "/tutor${lessonHint}"`);
}

export function createLocalFeatures({ context, root }: { context: vscode.ExtensionContext; root: string }) {
  const apiKeyStore = createApiKeyStore(context.secrets);

  function register(session: CourseSession) {
    function handleAskClaude() {
      return askClaude({
        root,
        lessonId: session.activeLessonId()
      });
    }
    return [
      vscode.commands.registerCommand(Command.ASK_CLAUDE, handleAskClaude),
      serveRoutes([
        tutorViewRoute({
          root,
          lesson: session.activeLesson,
          editor: session.lessonEditor
        }),
        apiKeyRoute(apiKeyStore),
        voiceSetupRoute(root),
        voiceFilesRoute(root)
      ]),
      ...registerVoiceTutor(apiKeyStore),
      ...watchLessons({
        root,
        onLessonsChanged() {
          void session.reloadLessons();
        }
      })
    ];
  }

  return {
    answerNarration: createNarrationVoices({
      root,
      state: context.globalState
    }),
    register
  };
}
