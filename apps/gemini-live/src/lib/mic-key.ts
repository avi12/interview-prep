import { DEFAULT_MIC_KEY, type MicKey, taughtOf, withTaughtKey } from "./mic-key-choice.ts";
import { MIC_KEY_HOST } from "./mic-key-host.ts";
import { loadMicKey, micKeyItem, parseMicKey, saveMicKey } from "./settings.ts";
import {
  DEFAULT_KEY_LABEL,
  type HidReport,
  hidReportSchema,
  isSameKey,
  isTaughtKeyFired,
  keyEventOf,
  pressAndRelease,
  taughtKeyOf,
  TeachRole,
  watchedReports
} from "./taught-key.ts";
import { z } from "./zod.ts";
import { type Browser, browser } from "wxt/browser";

const RECONNECT_MS = 10_000;
const TEACH_PRESS_TIMEOUT_MS = 15_000;
const TEACH_RELEASE_TIMEOUT_MS = 3000;
const HOST_MISSING_TEXT = "The key helper is not running. Install it with: pnpm --filter @interview-prep/gemini-live mic-key:install";
const BUSY_TEXT = "Already waiting for a key";
const NO_PRESS_TEXT = "No key press arrived. Try again and press the key on its own";
const SAME_KEY_TEXT = "That is the mic key itself. Press the key you hold with it";
const NO_RELEASE_TEXT = "That key never reports letting go, so it cannot be held";
const CANCELLED_TEXT = "Cancelled";
const HostCommand = {
  WATCH: "watch",
  LEARN: "learn",
  STOP_LEARNING: "stopLearning"
} as const;

type HostMessage =
  | {
    type: typeof HostCommand.WATCH;
    reports: HidReport[];
  }
  | { type: typeof HostCommand.LEARN }
  | { type: typeof HostCommand.STOP_LEARNING };

const hostEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }),
  z.object({
    type: z.literal("report"),
    report: hidReportSchema
  })
]);

export interface TeachResult {
  isTaught: boolean;
  detail: string;
}

function failure(detail: string): TeachResult {
  return {
    isTaught: false,
    detail
  };
}

export function listenToMicKey(toggle: () => void) {
  let port: Browser.runtime.Port | undefined;
  let isHostReady = false;
  let micKey: MicKey = DEFAULT_MIC_KEY;
  let isHeldKeyDown = false;
  let onTaughtReport: ((report: HidReport) => void) | undefined;
  let cancelGesture: (() => void) | undefined;

  function post(message: HostMessage) {
    port?.postMessage(message);
  }

  function watch() {
    post({
      type: HostCommand.WATCH,
      reports: watchedReports(taughtOf(micKey))
    });
  }

  function onReport(report: HidReport) {
    if (onTaughtReport) {
      onTaughtReport(report);
      return;
    }

    const taught = taughtOf(micKey);
    const event = keyEventOf({
      taught,
      report
    });
    if (!taught || !event) {
      return;
    }

    if (event.role === TeachRole.HELD_KEY) {
      isHeldKeyDown = event.isDown;
      return;
    }

    if (event.isDown && isTaughtKeyFired({
      taught,
      isHeldKeyDown
    })) {
      toggle();
    }
  }

  function onHostMessage(message: unknown) {
    const parsed = hostEventSchema.safeParse(message);
    if (!parsed.success) {
      return;
    }

    if (parsed.data.type === "ready") {
      isHostReady = true;
      watch();
      return;
    }

    onReport(parsed.data.report);
  }

  function connectHost() {
    port = browser.runtime.connectNative(MIC_KEY_HOST);
    port.onMessage.addListener(onHostMessage);
    port.onDisconnect.addListener(() => {
      void browser.runtime.lastError;
      port = undefined;
      isHostReady = false;
      isHeldKeyDown = false;
      setTimeout(connectHost, RECONNECT_MS);
    });
  }

  function collectGesture() {
    return new Promise<{
      reports: HidReport[];
      isCancelled: boolean;
    }>(resolveGesture => {
      const reports: HidReport[] = [];
      let releaseTimer: ReturnType<typeof setTimeout> | undefined;
      const pressTimer = setTimeout(finish, TEACH_PRESS_TIMEOUT_MS);

      function end(isCancelled: boolean) {
        clearTimeout(pressTimer);
        clearTimeout(releaseTimer);
        onTaughtReport = undefined;
        cancelGesture = undefined;
        resolveGesture({
          reports,
          isCancelled
        });
      }

      function finish() {
        end(false);
      }

      cancelGesture = () => end(true);
      onTaughtReport = report => {
        reports.push(report);
        releaseTimer ??= setTimeout(finish, TEACH_RELEASE_TIMEOUT_MS);

        if (pressAndRelease(reports)?.release) {
          finish();
        }
      };
    });
  }

  async function teach(role: TeachRole): Promise<TeachResult> {
    if (!isHostReady) {
      return failure(HOST_MISSING_TEXT);
    }

    if (onTaughtReport) {
      return failure(BUSY_TEXT);
    }

    post({ type: HostCommand.LEARN });
    const { reports, isCancelled } = await collectGesture();
    post({ type: HostCommand.STOP_LEARNING });

    if (isCancelled) {
      return failure(CANCELLED_TEXT);
    }

    const key = taughtKeyOf({
      reports,
      label: DEFAULT_KEY_LABEL[role]
    });
    if (!key) {
      return failure(NO_PRESS_TEXT);
    }

    const taught = taughtOf(micKey);
    if (role === TeachRole.HELD_KEY && taught && isSameKey(key, taught.key)) {
      return failure(SAME_KEY_TEXT);
    }

    if (role === TeachRole.HELD_KEY && key.release === null) {
      return failure(NO_RELEASE_TEXT);
    }

    await saveMicKey(
      withTaughtKey({
        micKey,
        role,
        key
      })
    );
    return {
      isTaught: true,
      detail: ""
    };
  }

  function cancelTeach() {
    cancelGesture?.();
  }

  micKeyItem.watch(raw => {
    micKey = parseMicKey(raw);
    isHeldKeyDown = false;
    watch();
  });
  void loadMicKey().then(loaded => {
    micKey = loaded;
    watch();
  });
  connectHost();
  return {
    teach,
    cancelTeach
  };
}
