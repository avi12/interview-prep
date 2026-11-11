import { apiKeySchema, clearGeminiKey, loadGeminiKey, saveGeminiKey } from "@/lib/gemini-key.ts";
import { lessonIdFromUrl } from "@/lib/lesson-address.ts";
import { buildSiteTutorView } from "@/lib/site-tutor-view.ts";
import { COURSE_PATH } from "@/lib/web-paths.ts";
import { SiteCommand } from "@/workbench/site-manifest.ts";
import { fetchParsed } from "@interview-prep/gemini-live/src/lib/fetch-parsed.ts";
import { DEFAULT_LANGUAGE } from "@interview-prep/gemini-live/src/lib/language.ts";
import { startScreenShare } from "@interview-prep/gemini-live/src/lib/live-api/screen-share.ts";
import { isRunning, LiveState } from "@interview-prep/gemini-live/src/lib/live-state.ts";
import {
  SiteBridgeMessage,
  siteMessenger,
  startResultSchema,
  type VoiceStatus,
  voiceStatusOrNoneSchema
} from "@interview-prep/gemini-live/src/lib/site-bridge.ts";
import { startTutorSession, type TutorSession } from "@interview-prep/gemini-live/src/voice/tutor-session.ts";
import { GEMINI_LIVE_VERSION_ATTRIBUTE } from "#scripts/lib/gemini-live-extension.ts";
import { INDEX_RELATIVE_PATH } from "#scripts/lib/layout.ts";
import { lessonIndexSchema, tutorNotesSchema } from "#scripts/lib/schema.ts";
import type { TutorView } from "#scripts/lib/tutor-view.ts";
import type * as vscode from "vscode";

type Api = typeof vscode;

const VoiceEngineKind = {
  subscription: "subscription",
  apiKey: "apiKey"
} as const;
type VoiceEngineKind = (typeof VoiceEngineKind)[keyof typeof VoiceEngineKind];

export type VoiceTutorStatus = {
  engine: VoiceEngineKind;
  state: LiveState;
  isMicOpen: boolean;
};

const KEY_PROMPT = "Paste your Gemini API key. It stays in this browser and goes only to Google";
const KEY_PLACEHOLDER = "AIza...";
const KEY_INVALID = "That does not look like a Gemini API key";
const CHANGE_KEY_LABEL = "Change API key";
const FORGET_KEY_LABEL = "Forget API key";
const KEY_LINK_LABEL = "Get a free API key";
const EXTENSION_BUTTON_TOOLTIP = "Use your Gemini subscription instead: add the Gemini Live extension";
const KEY_URL = "https://aistudio.google.com/apikey";

export function isExtensionInstalled() {
  return document.documentElement.hasAttribute(GEMINI_LIVE_VERSION_ATTRIBUTE);
}

function courseUrl(relativePath: string) {
  return new URL(`${COURSE_PATH}/${relativePath}`, location.origin);
}

async function lessonNotes() {
  const lessonId = lessonIdFromUrl(new URL(location.href));
  if (!lessonId) {
    return {
      title: null,
      notes: []
    };
  }

  const index = await fetchParsed({
    input: courseUrl(INDEX_RELATIVE_PATH),
    schema: lessonIndexSchema
  });
  const lesson = index?.lessons.find(candidate => candidate.id === lessonId);
  if (!lesson) {
    return {
      title: null,
      notes: []
    };
  }

  const notes = await fetchParsed({
    input: courseUrl(lesson.html.replace(/\.html$/, ".tutor.json")),
    schema: tutorNotesSchema
  });
  return {
    title: lesson.title,
    notes: notes ?? []
  };
}

export function createVoiceTutor({ api, onChange }: {
  api: Api;
  onChange: (status: VoiceTutorStatus | null) => void;
}) {
  let session: TutorSession | null = null;
  let status: VoiceTutorStatus | null = null;
  let stopShare: (() => void) | null = null;

  function show(next: VoiceTutorStatus | null) {
    status = next;
    onChange(next);
  }

  function showExtensionStatus(raw: VoiceStatus | null) {
    show(
      raw && isRunning(raw.state) ? {
        engine: VoiceEngineKind.subscription,
        state: raw.state,
        isMicOpen: raw.isMicOpen
      } : null
    );
  }

  siteMessenger.onMessage(SiteBridgeMessage.STATUS_CHANGED, ({ data }) => {
    const parsed = voiceStatusOrNoneSchema.safeParse(data);
    if (parsed.success) {
      showExtensionStatus(parsed.data);
    }
  });

  async function readView(): Promise<TutorView> {
    const { title, notes } = await lessonNotes();
    const editor = api.window.activeTextEditor;
    return buildSiteTutorView({
      lessonTitle: title,
      notes,
      file: editor ? {
        name: editor.document.fileName,
        code: editor.document.getText()
      } : null,
      lastTest: null
    });
  }

  function askForEnteredKey() {
    const { promise, resolve } = Promise.withResolvers<string | undefined>();
    const input = api.window.createInputBox();
    const linkButton = {
      iconPath: new api.ThemeIcon("link-external"),
      tooltip: KEY_LINK_LABEL
    };
    input.title = KEY_LINK_LABEL;
    input.prompt = `${KEY_PROMPT}. Get one free at ${KEY_URL}, or use the extension button to ride your Gemini subscription instead`;
    input.placeholder = KEY_PLACEHOLDER;
    input.password = true;
    input.ignoreFocusOut = true;
    const extensionButton = {
      iconPath: new api.ThemeIcon("extensions"),
      tooltip: EXTENSION_BUTTON_TOOLTIP
    };
    input.buttons = [linkButton, extensionButton];
    input.onDidTriggerButton(button => {
      if (button === extensionButton) {
        resolve(undefined);
        input.dispose();
        void api.commands.executeCommand(SiteCommand.showGeminiLive);
        return;
      }

      void api.env.openExternal(api.Uri.parse(KEY_URL));
    });
    input.onDidChangeValue(value => {
      input.validationMessage = !value || apiKeySchema.safeParse(value).success ? undefined : KEY_INVALID;
    });
    input.onDidAccept(() => {
      if (!apiKeySchema.safeParse(input.value).success) {
        input.validationMessage = KEY_INVALID;
        return;
      }

      resolve(input.value);
      input.dispose();
    });
    input.onDidHide(() => resolve(undefined));
    input.show();
    return promise;
  }

  async function askForKey() {
    const entered = await askForEnteredKey();
    if (entered === undefined || !saveGeminiKey(entered)) {
      return null;
    }

    return loadGeminiKey();
  }

  async function startWithKey(apiKey: string) {
    const share = await startScreenShare(() => void stop()).catch(() => null);
    if (!share) {
      void api.window.showErrorMessage("The voice tutor needs to see your screen. Share this tab to start");
      return;
    }

    stopShare = () => share.stop();
    show({
      engine: VoiceEngineKind.apiKey,
      state: LiveState.OPENING,
      isMicOpen: true
    });
    session = await startTutorSession({
      apiKey,
      language: DEFAULT_LANGUAGE,
      captureFrame: () => share.grab(),
      readView,
      events: {
        onState(state) {
          show({
            engine: VoiceEngineKind.apiKey,
            state,
            isMicOpen: status?.isMicOpen ?? true
          });
        },
        onCaption() {},
        onTurnComplete() {},
        onClosed(closure) {
          void stop();
          void api.window.showWarningMessage(`The voice tutor stopped: ${closure.reason}`);
        },
        onSpeakerBlocked() {}
      }
    }).catch((error: unknown) => {
      void stop();
      void api.window.showErrorMessage(error instanceof Error ? error.message : String(error));
      return null;
    });
  }

  async function startViaExtension() {
    const answer = await siteMessenger.sendMessage(SiteBridgeMessage.START).catch(() => null);
    const result = startResultSchema.safeParse(answer);
    if (result.success && !result.data.isStarted) {
      void api.window.showWarningMessage(result.data.detail);
    }
  }

  async function start() {
    if (isExtensionInstalled()) {
      await startViaExtension();
      return;
    }

    const apiKey = loadGeminiKey() ?? await askForKey();
    if (apiKey) {
      await startWithKey(apiKey);
    }
  }

  async function stop() {
    if (status?.engine === VoiceEngineKind.subscription) {
      await siteMessenger.sendMessage(SiteBridgeMessage.STOP).catch(() => undefined);
      return;
    }

    session?.stop();
    session = null;
    stopShare?.();
    stopShare = null;
    show(null);
  }

  async function toggleMic() {
    if (status?.engine === VoiceEngineKind.subscription) {
      await siteMessenger.sendMessage(SiteBridgeMessage.TOGGLE_MIC).catch(() => undefined);
      return;
    }

    if (!session || !status) {
      return;
    }

    const isMicOpen = !status.isMicOpen;
    session.setMicOpen(isMicOpen);
    show({
      ...status,
      isMicOpen
    });
  }

  async function manageKey() {
    const picked = await api.window.showQuickPick([CHANGE_KEY_LABEL, FORGET_KEY_LABEL, KEY_LINK_LABEL]);
    if (picked === CHANGE_KEY_LABEL) {
      await askForKey();
    }

    if (picked === FORGET_KEY_LABEL) {
      clearGeminiKey();
    }

    if (picked === KEY_LINK_LABEL) {
      await api.env.openExternal(api.Uri.parse(KEY_URL));
    }
  }

  void siteMessenger.sendMessage(SiteBridgeMessage.GET_STATUS).then(raw => {
    const parsed = voiceStatusOrNoneSchema.safeParse(raw);
    if (parsed.success) {
      showExtensionStatus(parsed.data);
    }
  }, () => undefined);

  return {
    start,
    stop,
    toggleMic,
    manageKey
  };
}
