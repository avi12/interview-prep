import { Speaker } from "./captions.ts";
import type { Frame } from "@/lib/bridge-vocab.ts";
import { buildInstructions } from "@/lib/brief.ts";
import type { Language } from "@/lib/language.ts";
import { openMic } from "@/lib/live-api/mic.ts";
import { createPlayback } from "@/lib/live-api/playback.ts";
import { type LiveClosure, LiveConnection, type LiveSession, openLiveSession } from "@/lib/live-api/session.ts";
import { LiveState } from "@/lib/live-state.ts";
import { requestTutorView } from "@/lib/request-tutor-view.ts";
import { tutorViewContext, tutorViewText } from "@/lib/tutor-view-text.ts";
import { TUTOR_VIEW_PATH } from "@scripts/lib/tutor-view.ts";

const VIEW_POLL_MS = 1000;
const FRAME_INTERVAL_MS = 1000;

const CONNECTION_STATE: Record<LiveConnection, LiveState> = {
  [LiveConnection.CONNECTING]: LiveState.OPENING,
  [LiveConnection.READY]: LiveState.LIVE,
  [LiveConnection.RECONNECTING]: LiveState.RECONNECTING
};

export interface TutorSessionEvents {
  onState(state: LiveState): void;
  onCaption(caption: {
    speaker: Speaker;
    text: string;
  }): void;
  onTurnComplete(): void;
  onClosed(closure: LiveClosure): void;
  onSpeakerBlocked(isBlocked: boolean): void;
}

export interface TutorSessionOptions {
  apiKey: string;
  language: Language;
  captureFrame: () => Promise<Frame | null>;
  events: TutorSessionEvents;
}

function everyInterval({ intervalMs, task }: {
  intervalMs: number;
  task: () => Promise<void>;
}) {
  let isBusy = false;
  const timer = setInterval(() => {
    if (isBusy) {
      return;
    }

    isBusy = true;
    void task().finally(() => {
      isBusy = false;
    });
  }, intervalMs);
  return () => clearInterval(timer);
}

export async function startTutorSession({ apiKey, language, captureFrame, events }: TutorSessionOptions) {
  let session: LiveSession | null = null;
  let isMicOpen = true;
  let sentVersion = "";
  const stoppers: (() => void)[] = [];

  function stop() {
    for (const stopper of stoppers.splice(0)) {
      stopper();
    }
  }

  events.onState(LiveState.OPENING);
  const playback = createPlayback(isBlocked => events.onSpeakerBlocked(isBlocked));
  stoppers.push(() => playback.close());
  playback.resume();
  const mic = await openMic(pcm => {
    if (isMicOpen) {
      session?.sendAudio(pcm);
    }
  }).catch((error: unknown) => {
    stop();
    throw error;
  });
  stoppers.push(() => mic.close());

  const view = await requestTutorView(TUTOR_VIEW_PATH);
  const liveSession = openLiveSession({
    apiKey,
    systemInstruction: buildInstructions({
      context: tutorViewContext(view),
      language
    }),
    events: {
      onConnection(connection) {
        if (connection === LiveConnection.READY) {
          sentVersion = "";
        }

        events.onState(CONNECTION_STATE[connection]);
      },
      onAudio: bytes => playback.play(bytes),
      onInterrupted: () => playback.flush(),
      onUserText: text => events.onCaption({
        speaker: Speaker.LEARNER,
        text
      }),
      onModelText: text => events.onCaption({
        speaker: Speaker.TUTOR,
        text
      }),
      onTurnComplete: () => events.onTurnComplete(),
      onClosed(closure) {
        stop();
        events.onClosed(closure);
      }
    }
  });
  session = liveSession;
  stoppers.push(() => liveSession.close());

  stoppers.push(
    everyInterval({
      intervalMs: VIEW_POLL_MS,
      async task() {
        const latest = await requestTutorView(TUTOR_VIEW_PATH);
        if (!latest || latest.version === sentVersion) {
          return;
        }

        sentVersion = latest.version;
        liveSession.sendContext(tutorViewText(latest));
      }
    })
  );
  stoppers.push(
    everyInterval({
      intervalMs: FRAME_INTERVAL_MS,
      async task() {
        const frame = await captureFrame();
        if (frame) {
          liveSession.sendFrame(frame);
        }
      }
    })
  );

  return {
    setMicOpen(isOpen: boolean) {
      isMicOpen = isOpen;

      if (!isOpen) {
        liveSession.endAudio();
      }
    },
    unblockSpeaker: () => playback.resume(),
    stop
  };
}

export type TutorSession = Awaited<ReturnType<typeof startTutorSession>>;
