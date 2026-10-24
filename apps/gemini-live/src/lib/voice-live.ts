import { Engine } from "./engine.ts";
import { ExtensionMessage, extensionMessenger } from "./extension-channel.ts";
import { captureForSession } from "./live-capture.ts";
import type { LiveEngine } from "./live-engine.ts";
import { openLiveSession } from "./live-window.ts";
import type { Session } from "./session-schema.ts";
import { loadEngineSession, updateSession } from "./session.ts";
import { loadLanguage } from "./settings.ts";
import { VOICE_URL } from "./voice-page.ts";
import { voiceReportSchema } from "./voice-protocol.ts";
import { within } from "./within.ts";

const CALL_TIMEOUT_MS = 5000;
const NO_BRIEF = "";

function tellPage({ session, name }: {
  session: Session;
  name: typeof ExtensionMessage.VOICE_STOP | typeof ExtensionMessage.VOICE_MIC_TOGGLE;
}) {
  return within({
    timeoutMs: CALL_TIMEOUT_MS,
    promise: extensionMessenger.sendMessage(name, undefined, session.liveTab),
    fallback: null
  });
}

export const voiceEngine: LiveEngine = {
  open(vscodeTab) {
    return openLiveSession({
      engine: Engine.API_KEY,
      url: VOICE_URL,
      vscodeTab,
      brief: NO_BRIEF
    });
  },
  stop(session) {
    return tellPage({
      session,
      name: ExtensionMessage.VOICE_STOP
    });
  },
  toggleMic(session) {
    return tellPage({
      session,
      name: ExtensionMessage.VOICE_MIC_TOGGLE
    });
  },
  async retitle() {}
};

export function installVoice({ untilStarted }: { untilStarted: () => Promise<unknown> }) {
  async function voiceSession(tab: { id?: number } | undefined) {
    await untilStarted();
    return loadEngineSession({
      engine: Engine.API_KEY,
      tab
    });
  }

  extensionMessenger.onMessage(ExtensionMessage.VOICE_HELLO, async ({ sender }) => {
    const session = await voiceSession(sender.tab);
    return {
      language: await loadLanguage(),
      isAutostart: !!session
    };
  });

  extensionMessenger.onMessage(ExtensionMessage.VOICE_CAPTURE, async ({ sender }) => {
    const session = await voiceSession(sender.tab);
    return session ? captureForSession(session) : null;
  });

  extensionMessenger.onMessage(ExtensionMessage.VOICE_REPORT, async ({ data, sender }) => {
    const report = voiceReportSchema.safeParse(data);
    const session = report.success ? await voiceSession(sender.tab) : null;
    if (session && report.success) {
      await updateSession(report.data);
    }
  });
}
