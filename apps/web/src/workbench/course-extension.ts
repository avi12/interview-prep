import { browserStorage } from "@/lib/browser-storage.ts";
import { lessonIdFromUrl, urlForLesson } from "@/lib/lesson-address.ts";
import type { ProgressSession } from "@/lib/progress-session.ts";
import { COURSE_PATH } from "@/lib/web-paths.ts";
import { z } from "@/lib/zod.ts";
import { loadStarterFiles } from "@/runner/lesson-data.ts";
import { WORKSPACE_ROOT } from "@/workbench/workspace-files.ts";
import { ExtensionHostKind, type IExtensionManifest, registerExtension } from "@codingame/monaco-vscode-api/extensions";
import elementsBundle from "interview-prep/dist/webview/elements.js?raw";
import iconUrl from "interview-prep/media/icon.svg?url";
import type { KeyValueStorage } from "interview-prep/src/storageMemento.ts";
import type { LessonFile } from "interview-prep/src/webHost.ts";
import { WEB_EXTENSION_MANIFEST } from "interview-prep/src/webManifest.ts";

const ICON_PATH = "media/icon.svg";

function keyValueStorage(): KeyValueStorage {
  const storage = browserStorage();
  if (storage) {
    return storage;
  }

  const values = new Map<string, string>();
  return {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

const webManifestSchema = z.object({
  views: z.record(
    z.string(), z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(["tree", "webview"]).optional()
      })
    )
  ),
  capabilities: z.object({
    untrustedWorkspaces: z.object({ supported: z.literal(true) })
  })
});

function courseManifest(): IExtensionManifest {
  const parsed = webManifestSchema.safeParse({
    views: WEB_EXTENSION_MANIFEST.contributes.views,
    capabilities: WEB_EXTENSION_MANIFEST.capabilities
  });
  if (!parsed.success) {
    throw new Error(`The course extension's manifest is not in the expected shape: ${parsed.error.message}`);
  }

  return {
    ...WEB_EXTENSION_MANIFEST,
    contributes: {
      ...WEB_EXTENSION_MANIFEST.contributes,
      views: parsed.data.views
    },
    capabilities: parsed.data.capabilities
  };
}

async function runLesson({ lesson, files }: {
  lesson: { id: string };
  files: readonly LessonFile[];
}) {
  const runner = await import("@/runner/run-lesson.ts");
  return runner.runLesson({
    lesson,
    files: Object.fromEntries(files.map(({ path, content }) => [path, content]))
  });
}

export function registerCourseExtension() {
  const extension = registerExtension(courseManifest(), ExtensionHostKind.LocalProcess);
  extension.registerFileUrl(ICON_PATH, new URL(iconUrl, location.href).href);
  return extension;
}

export async function activateCourseExtension({ extension, session }: {
  extension: ReturnType<typeof registerCourseExtension>;
  session: ProgressSession;
}) {
  await extension.setAsDefaultApi();
  const { activateWeb } = await import("interview-prep/src/web.ts");
  await activateWeb({
    storage: keyValueStorage(),
    elementsBundle,
    address: {
      initialLessonId: () => lessonIdFromUrl(new URL(location.href)),
      showLesson(lessonId) {
        history.replaceState(
          null, "", urlForLesson({
            url: new URL(location.href),
            lessonId
          })
        );
      }
    },
    courseBaseUrl: new URL(`${COURSE_PATH}/`, location.origin).href,
    workspaceRoot: WORKSPACE_ROOT,
    readStarter: loadStarterFiles,
    runLesson,
    progress: {
      current: () => session.progress,
      subscribe: listener => session.subscribe(listener),
      markPassed: lessonId => session.recordPass(lessonId)
    }
  });
}
