import { installBidi } from "@/lib/bidi.ts";
import { BridgeMessage, bridgeMessenger } from "@/lib/bridge-channel.ts";
import {
  type Activation,
  BridgeFailure,
  type Frame,
  GLIC_URL,
  GlicCommand,
  GlicReport,
  GlicState
} from "@/lib/bridge-vocab.ts";
import { type MicMixer, mixMicrophone } from "@/lib/mic-mixer.ts";
import { annotatedPageContent, byteStream } from "@/lib/page-content.ts";
import { PromptEvent } from "@/lib/prompt-clip.ts";
import { within } from "@/lib/within.ts";
import { z } from "@/lib/zod.ts";
import type { TutorTestRun, TutorView } from "@scripts/lib/tutor-view.ts";
import { defineContentScript } from "#imports";

/*
 * Runs in the page's own world on gemini.google.com/glic and plays the browser host that
 * Gemini's web client expects: the client runs Live itself and asks its host for the
 * pictures it looks at (getContextFromTab, about once a second). Button labels, phrases and
 * flag keys below are Google's and will change one day; each is named once here.
 */

const Button = {
  CONFIRM_OK: "OK",
  COPY: "Copy",
  END: "End",
  GO_BACK: "Go back",
  GO_LIVE: "Go Live",
  GOOD_RESPONSE: "Good response",
  NO_THANKS: "No thanks",
  PAUSE_LIVE: "Pause live mode",
  REGENERATE: "Regenerate",
  SEND: "Send",
  SEND_MESSAGE: "Send message",
  SKIP: "Skip",
  START_LIVE: "Start live mode",
  STOP_RESPONSE: "Stop response",
  SUBMIT: "Submit",
  TEXT_MODE: "Switch to text mode",
  TRY_AGAIN: "Try again",
  TURN_ON_CAPTIONS: "Turn on live captions"
} as const;

const RESUME_BUTTONS = [Button.START_LIVE, Button.GO_LIVE];
const SUBMIT_BUTTONS = [Button.SUBMIT, Button.SEND_MESSAGE, Button.SEND];
const REPLY_DONE_BUTTONS = [Button.COPY, Button.GOOD_RESPONSE, Button.REGENERATE];

const Phrase = {
  MIC_CONSENT: "Live will use your microphone",
  UNAVAILABLE: "isn't available right now",
  WENT_WRONG: "Something went wrong"
} as const;
const SIGN_IN = /\bSign in\b/;
const ACCOUNTS_HOST = "accounts.google.com";

const PanelStateKind = { ATTACHED: 2 } as const;
const Platform = { LINUX: 3 } as const;
const FormFactor = { DESKTOP: 1 } as const;
const HostCapability = {
  MULTI_INSTANCE: 3,
  PDF_ZERO_STATE: 7,
  INVOKE: 8
} as const;

const TAB_ID = "vscode";
const PANEL_STATE = {
  kind: PanelStateKind.ATTACHED,
  windowId: TAB_ID
};
const FAKE_CHROME_VERSION = {
  major: 130,
  minor: 0,
  build: 0,
  patch: 0
};
const SHARED_TAB_TITLE = "VS Code";
const USER_NAME = "You";

const BOOT_POLL_MS = 100;
const MAX_BOOT_TRIES = 150;
const UNAVAILABLE_POLL_MS = 500;
const START_POLL_MS = 300;
const MAX_START_TRIES = 100;
const MONITOR_POLL_MS = 300;
const SCREEN_NUDGE_MS = 1000;
const VIEW_POLL_MS = 1000;
const VIEW_QUIET_MS = 1200;
const VIEW_TIMEOUT_MS = 2000;
const PROMPT_SETTLE_MS = 2500;
const PROMPT_QUIET_WAIT_MS = 10_000;
const FRAME_TIMEOUT_MS = 3000;
const RESUME_GAP_MS = 2000;
const MAX_RESUME_TRIES = 5;
const BROKEN_AFTER_MS = 15_000;
const TRY_AGAIN_GAP_MS = 5000;
const TEXT_READY_MS = 6000;
const REPLY_MS = 30_000;
const SETTLE_MS = 1400;
const WAIT_POLL_MS = 150;
const REPLY_POLL_MS = 200;

const DAY_SECONDS = 24 * 60 * 60;
const LIVE_TIMEOUT_FLAGS: Record<string, number> = {
  45681081: DAY_SECONDS,
  45681082: DAY_SECONDS,
  45687231: DAY_SECONDS * 1000,
  45677155: DAY_SECONDS * 1000
};

const MIC_QUALITY_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  voiceIsolation: true
};
const REPLY_SELECTORS = "message-content, .model-response-text, .markdown, [data-response-index]";

type Json = Record<string, unknown>;
type Subscriber = (value: unknown) => void;
type Timer = ReturnType<typeof setInterval> | undefined;

declare global {
  interface Window {
    default_BardChatUi?: Record<string, unknown>;
    internalAutoGlicBoot?: () => unknown;
  }
}

const liveFlagSchema = z.looseObject({ key: z.string() });

interface LiveFlag {
  key: string;
  defaultValue?: unknown;
  ctor?: () => unknown;
}

interface Bridge {
  isActive: boolean;
  isActivated: boolean;
  isBooted: boolean;
  isUnavailableReported: boolean;
  isBrokenReported: boolean;
  isConsentAccepted: boolean;
  isTimeoutsPatched: boolean;
  lastState: GlicState | null;
  lastResume: number;
  resumeTries: number;
  lastLive: number;
  lastTryAgain: number;
  lastNudge: number;
  nudges: number;
  latestView: TutorView | null;
  latestViewAt: number;
  sharedVersion: string;
  isViewPending: boolean;
  announcedTestAt: string | null;
  isPrompting: boolean;
  isMicOpen: boolean;
  mixer: MicMixer | null;
  monitorTimer: Timer;
  startTimer: Timer;
  focusedTab: Json;
}

function isLiveFlag(value: unknown): value is LiveFlag {
  return liveFlagSchema.safeParse(value).success;
}

const bridge: Bridge = {
  isActive: false,
  isActivated: false,
  isBooted: false,
  isUnavailableReported: false,
  isBrokenReported: false,
  isConsentAccepted: false,
  isTimeoutsPatched: false,
  lastState: null,
  lastResume: 0,
  resumeTries: 0,
  lastLive: 0,
  lastTryAgain: 0,
  lastNudge: 0,
  nudges: 0,
  latestView: null,
  latestViewAt: 0,
  sharedVersion: "",
  isViewPending: false,
  announcedTestAt: null,
  isPrompting: false,
  isMicOpen: false,
  mixer: null,
  monitorTimer: undefined,
  startTimer: undefined,
  focusedTab: {
    tabId: TAB_ID,
    url: "",
    title: SHARED_TAB_TITLE,
    faviconUrl: "",
    documentMimeType: "text/html",
    isMediaActive: false
  }
};

const bootstrapHandlers: EventListener[] = [];

function report(sending: Promise<void>) {
  void sending.catch(() => {});
}

function setState(state: GlicState) {
  if (bridge.lastState === state) {
    return;
  }

  bridge.lastState = state;
  report(bridgeMessenger.sendMessage(GlicReport.STATE, state));
}

function sleep(delayMs: number) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

function pageText() {
  return document.body?.innerText ?? "";
}
function pageSays(phrase: string) {
  return pageText().includes(phrase);
}

function findButton(...fragments: string[]) {
  const buttons = [...document.querySelectorAll("button")];
  for (const fragment of fragments) {
    const found = buttons.find(button => (button.getAttribute("aria-label") ?? "").includes(fragment));
    if (found) {
      return found;
    }
  }
  return null;
}

function clickButton(...fragments: string[]) {
  const button = findButton(...fragments);
  button?.click();
  return !!button;
}

function isSignedOut() {
  if (location.hostname === ACCOUNTS_HOST) {
    return true;
  }

  return SIGN_IN.test(pageText()) && !findButton(Button.GO_LIVE);
}

function reportFailure(failure: BridgeFailure) {
  return report(bridgeMessenger.sendMessage(GlicReport.FAILED, failure));
}

function reportStartFailure(fallback: BridgeFailure) {
  return reportFailure(isSignedOut() ? BridgeFailure.SIGNED_OUT : fallback);
}

function decodeFrame(frame: Frame | null) {
  if (!frame?.base64) {
    return null;
  }

  const bytes = Uint8Array.from(atob(frame.base64), char => char.charCodeAt(0));
  return {
    data: bytes.buffer,
    mimeType: frame.mimeType,
    widthPixels: frame.width,
    heightPixels: frame.height
  };
}

async function captureFrame() {
  if (!bridge.isActive) {
    return null;
  }

  const frame = await within({
    timeoutMs: FRAME_TIMEOUT_MS,
    promise: bridgeMessenger.sendMessage(BridgeMessage.CAPTURE),
    fallback: null
  });
  return decodeFrame(frame);
}

function notify<T>({ subscriber, value }: {
  subscriber: (value: T) => void;
  value: T;
}) {
  try {
    subscriber(value);
  } catch {
    /* a subscriber's error is its own */
  }
}

function observable(value: unknown) {
  return {
    subscribe(change: Subscriber) {
      notify({
        subscriber: change,
        value
      });
      return { unsubscribe() {} };
    }
  };
}

function currentTabData() {
  return {
    ...bridge.focusedTab,
    tabId: `${TAB_ID}-${bridge.nudges}`
  };
}

function focusedTabState() {
  return {
    hasFocus: {
      tabData: currentTabData()
    }
  };
}

const focusedTabSubscribers = new Set<Subscriber>();

function focusedTabObservable() {
  return {
    subscribe(change: Subscriber) {
      focusedTabSubscribers.add(change);
      notify({
        subscriber: change,
        value: focusedTabState()
      });
      return { unsubscribe: () => focusedTabSubscribers.delete(change) };
    }
  };
}

function announceFocusedTab() {
  for (const subscriber of focusedTabSubscribers) {
    notify({
      subscriber,
      value: focusedTabState()
    });
  }
}

interface ContextOptions {
  viewportScreenshot?: boolean;
  annotatedPageContent?: boolean;
}

function tabContext(options?: ContextOptions): Json {
  const tabData = currentTabData();
  const view = bridge.latestView;
  if (!options?.annotatedPageContent || !view) {
    return { tabData };
  }

  const bytes = annotatedPageContent({
    title: view.title,
    url: String(bridge.focusedTab.url),
    blocks: view.blocks
  });
  return {
    tabData,
    annotatedPageData: {
      annotatedPageContent: byteStream(bytes)
    }
  };
}

function resolved(value: unknown) {
  return () => Promise.resolve(value);
}
const captions = observable(true);

const host: Json = {
  getChromeVersion: resolved(FAKE_CHROME_VERSION),
  getPlatform: () => Platform.LINUX,
  getFormFactor: () => FormFactor.DESKTOP,
  getHostCapabilities: () => new Set(Object.values(HostCapability)),
  getUserProfileInfo: resolved({
    displayName: USER_NAME,
    email: "",
    givenName: USER_NAME,
    localProfileName: USER_NAME,
    isManaged: false,
    avatarIcon: resolved(undefined)
  }),
  getPanelState: () => observable(PANEL_STATE),
  panelActive: () => observable(true),
  getFocusedTabStateV2: focusedTabObservable,
  getContextFromFocusedTab: (options?: ContextOptions) => Promise.resolve(tabContext(options)),
  captureScreenshot: () => captureFrame(),
  async getContextFromTab(_tabId: unknown, options?: ContextOptions) {
    const context = tabContext(options);
    if (!options?.viewportScreenshot) {
      return context;
    }

    const shot = await captureFrame();
    if (!shot) {
      return context;
    }

    context.viewportScreenshot = shot;
    context.screenshotInfo = {
      widthPixels: shot.widthPixels,
      heightPixels: shot.heightPixels
    };
    return context;
  },
  getTabContextPermissionStateV2: () => observable(true),
  getMicrophonePermissionState: () => observable(true),
  getLocationPermissionState: () => observable(true),
  getTabContextPermissionState: () => observable(true),
  getClosedCaptioningSetting: () => captions,
  getDefaultTabContextPermissionState: () => observable(true),
  canAttachPanel: () => observable(false),
  isBrowserOpen: () => observable(true),
  isManuallyResizing: () => observable(false),
  getOsMicrophonePermissionStatus: resolved(true),
  getOsHotkeyState: () => observable({ hotkey: "" }),
  resizeWindow: resolved(undefined),
  setTabContextPermissionState: resolved(undefined),
  setMicrophonePermissionState: resolved(undefined),
  setLocationPermissionState: resolved(undefined),
  setClosedCaptioningSetting: resolved(undefined),
  attachPanel: resolved(undefined),
  detachPanel: resolved(undefined),
  closePanel() {
    setState(GlicState.IDLE);
    return Promise.resolve();
  }
};

interface WebClient extends Json {
  initialize(hostApi: Json): unknown;
  notifyPanelWillOpen?(state: unknown): unknown;
}

const registry = {
  registerWebClient: (client: WebClient) =>
    Promise.resolve()
      .then(() => client.initialize(host))
      .then(() => {
        bridge.isBooted = true;
        report(bridgeMessenger.sendMessage(GlicReport.BOOTED));
        setTimeout(() => notify({
          subscriber: state => client.notifyPanelWillOpen?.(state),
          value: PANEL_STATE
        }), 0);
      })
};

function bootstrapEvent() {
  return new MessageEvent("message", {
    origin: "chrome://glic",
    source: window,
    data: {
      type: "glic-bootstrap",
      glicApiSource: "data:text/javascript,//vscode"
    }
  });
}

function tryBootstrap() {
  if (bridge.isBooted || !bridge.isActivated) {
    return;
  }

  for (const handler of bootstrapHandlers) {
    notify({
      subscriber: handler,
      value: bootstrapEvent()
    });
  }
}

type AddEventListener = typeof EventTarget.prototype.addEventListener;

function remembered(add: AddEventListener): AddEventListener {
  return function (this: EventTarget, type, listener, options) {
    const isWindowMessage = this === window && type === "message" && typeof listener === "function";
    if (isWindowMessage && !bootstrapHandlers.includes(listener)) {
      bootstrapHandlers.push(listener);
    }

    return add.call(this, type, listener, options);
  };
}

function captureBootstrapListeners() {
  EventTarget.prototype.addEventListener = remembered(EventTarget.prototype.addEventListener);
  Object.defineProperty(window, "addEventListener", {
    configurable: true,
    writable: true,
    value: remembered(window.addEventListener)
  });
}

function patchVisibility() {
  try {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible"
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false
    });
    document.addEventListener("visibilitychange", event => event.stopImmediatePropagation(), true);
  } catch {
    /* the page froze these; it keeps its own visibility */
  }
}

function patchMic() {
  try {
    const media = navigator.mediaDevices;
    const getUserMedia = media.getUserMedia.bind(media);
    media.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      if (!constraints) {
        return getUserMedia(constraints);
      }

      const { video, ...rest } = constraints;
      if (video && !rest.audio) {
        throw new DOMException("the camera is not shared", "NotAllowedError");
      }

      if (!rest.audio) {
        return getUserMedia(rest);
      }

      const asked = rest.audio === true ? {} : rest.audio;
      const audio: MediaTrackConstraints = {
        ...asked,
        ...MIC_QUALITY_CONSTRAINTS
      };
      const microphone = await getUserMedia({
        ...rest,
        audio
      });
      try {
        bridge.mixer = mixMicrophone(microphone);
        bridge.mixer.setOpen(bridge.isMicOpen);
        return bridge.mixer.stream;
      } catch {
        return microphone;
      }
    };
  } catch {
    /* frozen mediaDevices: the client captures with its own settings */
  }
}

function patchLiveTimeouts() {
  if (bridge.isTimeoutsPatched) {
    return true;
  }

  const flags = window.default_BardChatUi;
  if (!flags) {
    return false;
  }

  let found = 0;
  for (const flag of Object.values(flags)) {
    if (!isLiveFlag(flag)) {
      continue;
    }

    const value = LIVE_TIMEOUT_FLAGS[flag.key];
    if (value === undefined) {
      continue;
    }

    flag.defaultValue = value;
    flag.ctor = () => value;
    found++;
  }
  bridge.isTimeoutsPatched = found === Object.keys(LIVE_TIMEOUT_FLAGS).length;
  return bridge.isTimeoutsPatched;
}

function markBroken() {
  if (bridge.isBrokenReported) {
    return;
  }

  bridge.isBrokenReported = true;
  reportFailure(BridgeFailure.LIVE_BROKE);
}

function resume() {
  const now = Date.now();
  if (now - bridge.lastResume < RESUME_GAP_MS * Math.min(bridge.resumeTries + 1, MAX_RESUME_TRIES)) {
    return;
  }

  bridge.resumeTries++;
  bridge.lastResume = now;
  clickButton(...RESUME_BUTTONS);
}

function tryAgainButton() {
  return [...document.querySelectorAll("button")].find(button =>
    `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`.includes(Button.TRY_AGAIN));
}

function shareScreen(now: number) {
  bridge.lastNudge = now;
  bridge.nudges++;
  announceFocusedTab();
}

function testRunEvent(run: TutorTestRun) {
  return run.isPass ? PromptEvent.TEST_PASSED : PromptEvent.TEST_FAILED;
}

async function speakTestRun(run: TutorTestRun) {
  const { mixer } = bridge;
  if (!mixer || bridge.isPrompting) {
    return;
  }

  bridge.isPrompting = true;
  try {
    await sleep(PROMPT_SETTLE_MS);
    const url = await within({
      timeoutMs: VIEW_TIMEOUT_MS,
      promise: bridgeMessenger.sendMessage(BridgeMessage.PROMPT_CLIP, { event: testRunEvent(run) }),
      fallback: null
    });
    if (!url) {
      return;
    }

    const audio = await (await fetch(url)).arrayBuffer();
    await waitFor({
      predicate: () => mixer.isQuiet() || null,
      timeoutMs: PROMPT_QUIET_WAIT_MS
    });
    await mixer.play(audio);
  } catch {
    /* a missing clip only costs the spoken nudge; the page content still has the run */
  } finally {
    bridge.isPrompting = false;
  }
}

function announceNewTestRun(view: TutorView) {
  const runAt = view.testRun?.ranAt ?? "";
  if (runAt === bridge.announcedTestAt) {
    return;
  }

  bridge.announcedTestAt = runAt;

  if (view.testRun) {
    void speakTestRun(view.testRun);
  }
}

function shareWhenSettled(now: number) {
  const view = bridge.latestView;
  if (!view) {
    if (now - bridge.lastNudge >= SCREEN_NUDGE_MS) {
      shareScreen(now);
    }

    return;
  }

  const isNew = view.version !== bridge.sharedVersion;
  if (!isNew || now - bridge.latestViewAt < VIEW_QUIET_MS) {
    return;
  }

  bridge.sharedVersion = view.version;
  shareScreen(now);
  announceNewTestRun(view);
}

async function pollTutorView() {
  if (bridge.isViewPending) {
    return;
  }

  bridge.isViewPending = true;
  const view = await within({
    timeoutMs: VIEW_TIMEOUT_MS,
    promise: bridgeMessenger.sendMessage(BridgeMessage.TUTOR_VIEW),
    fallback: null
  }).catch(() => null);
  bridge.isViewPending = false;

  if (!view) {
    bridge.latestView = null;
    return;
  }

  if (view.version === bridge.latestView?.version) {
    return;
  }

  if (!bridge.latestView) {
    bridge.sharedVersion = view.version;
  }

  bridge.announcedTestAt ??= view.testRun?.ranAt ?? "";
  bridge.latestView = view;
  bridge.latestViewAt = Date.now();
}

function monitorTick() {
  if (!bridge.isActive) {
    return;
  }

  const now = Date.now();
  shareWhenSettled(now);
  const isWrong = pageSays(Phrase.WENT_WRONG);
  if (findButton(Button.PAUSE_LIVE) && !isWrong) {
    bridge.lastLive = now;
    bridge.resumeTries = 0;
    bridge.isBrokenReported = false;
    return setState(GlicState.LISTENING);
  }

  if (!isWrong && findButton(...RESUME_BUTTONS)) {
    setState(GlicState.RESUMING);
    return resume();
  }

  setState(GlicState.RESUMING);
  const retry = tryAgainButton();
  if (retry && now - bridge.lastTryAgain > TRY_AGAIN_GAP_MS) {
    bridge.lastTryAgain = now;
    retry.click();
  }

  if (isWrong && now - bridge.lastLive > BROKEN_AFTER_MS) {
    markBroken();
  }
}

function advanceToLive() {
  const ok = findButton(Button.CONFIRM_OK);
  if (ok && findButton(Button.NO_THANKS) && pageSays(Phrase.MIC_CONSENT)) {
    ok.click();
    bridge.isConsentAccepted = true;
    return;
  }

  const skip = findButton(Button.SKIP);
  if (skip && findButton(Button.GO_BACK) && findButton(Button.TURN_ON_CAPTIONS)) {
    return skip.click();
  }

  if (clickButton(Button.START_LIVE) || bridge.isConsentAccepted) {
    return;
  }

  clickButton(Button.GO_LIVE);
}

function startLive() {
  bridge.isActive = true;
  bridge.lastState = null;
  bridge.isConsentAccepted = false;
  bridge.resumeTries = 0;
  clearInterval(bridge.startTimer);
  let tries = 0;
  bridge.startTimer = setInterval(() => {
    if (!bridge.isActive || bridge.isUnavailableReported) {
      return clearInterval(bridge.startTimer);
    }

    tryBootstrap();

    if (!patchLiveTimeouts() && tries < MAX_START_TRIES / 2) {
      tries++;
      return;
    }

    if (findButton(Button.PAUSE_LIVE)) {
      clearInterval(bridge.startTimer);
      bridge.lastLive = Date.now();
      bridge.isBrokenReported = false;
      report(bridgeMessenger.sendMessage(GlicReport.READY));
      setState(GlicState.LISTENING);
      bridge.monitorTimer ??= setInterval(monitorTick, MONITOR_POLL_MS);
      return;
    }

    advanceToLive();

    if (++tries <= MAX_START_TRIES) {
      return;
    }

    clearInterval(bridge.startTimer);
    reportStartFailure(BridgeFailure.LIVE_DID_NOT_START);
  }, START_POLL_MS);
  return true;
}

function stopLive() {
  bridge.isActive = false;
  clearInterval(bridge.startTimer);
  clickButton(Button.TEXT_MODE, Button.PAUSE_LIVE, Button.END);
  setState(GlicState.IDLE);
  return true;
}

function setMic(isOpen: boolean) {
  bridge.isMicOpen = isOpen;
  bridge.mixer?.setOpen(isOpen);
}

async function waitFor<T>({ predicate, timeoutMs }: {
  predicate: () => T | null | undefined;
  timeoutMs: number;
}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = predicate();
    if (value) {
      return value;
    }

    await sleep(WAIT_POLL_MS);
  }
  return null;
}

function textBox() {
  return document.querySelector<HTMLElement>("[contenteditable=\"true\"]");
}

function lastReply() {
  const replies = document.querySelectorAll<HTMLElement>(".presented-response-container");
  const last = replies[replies.length - 1];
  if (last) {
    return last;
  }

  const nodes = document.querySelectorAll<HTMLElement>(REPLY_SELECTORS);
  return nodes[nodes.length - 1] ?? null;
}

async function beginText() {
  bridge.isActive = false;
  clearInterval(bridge.startTimer);
  clearInterval(bridge.monitorTimer);
  bridge.monitorTimer = undefined;
  clickButton(Button.TEXT_MODE);
  const box = await waitFor({
    predicate: textBox,
    timeoutMs: TEXT_READY_MS
  });
  if (!box) {
    return false;
  }

  box.focus();
  document.execCommand("selectAll");
  document.execCommand("delete");
  return true;
}

async function submitAndRead() {
  const before = lastReply();
  clickButton(...SUBMIT_BUTTONS);
  let seen = "";
  let stableSince = 0;
  const deadline = Date.now() + REPLY_MS;
  while (Date.now() < deadline) {
    const reply = lastReply();
    const text = reply && reply !== before ? reply.innerText : "";
    const isSettled = !!text && text === seen && !!findButton(...REPLY_DONE_BUTTONS);
    if (!isSettled) {
      stableSince = 0;
      seen = text;
    } else {
      stableSince ||= Date.now();

      if (Date.now() - stableSince > SETTLE_MS) {
        return true;
      }
    }

    await sleep(REPLY_POLL_MS);
  }

  if (clickButton(Button.STOP_RESPONSE)) {
    await sleep(SETTLE_MS);
  }

  return false;
}

function watchBoot() {
  let tries = 0;
  const bootTimer = setInterval(() => {
    tryBootstrap();

    if (!bridge.isBooted && ++tries <= MAX_BOOT_TRIES) {
      return;
    }

    clearInterval(bootTimer);
    const isAlreadyExplained = bridge.isBooted || bridge.isUnavailableReported;
    if (!isAlreadyExplained) {
      reportStartFailure(BridgeFailure.PAGE_DID_NOT_START);
    }
  }, BOOT_POLL_MS);
}

function watchUnavailable() {
  const timer = setInterval(() => {
    if (!pageSays(Phrase.UNAVAILABLE)) {
      return;
    }

    clearInterval(timer);
    bridge.isUnavailableReported = true;
    reportFailure(BridgeFailure.UNAVAILABLE);
  }, UNAVAILABLE_POLL_MS);
}

function activate({ title, url }: Activation) {
  bridge.focusedTab = {
    ...bridge.focusedTab,
    title,
    url: url || location.origin
  };
  announceFocusedTab();

  if (bridge.isActivated) {
    return;
  }

  bridge.isActivated = true;
  setInterval(pollTutorView, VIEW_POLL_MS);
  void pollTutorView();
  patchVisibility();
  patchMic();
  window.internalAutoGlicBoot = () => registry;
  watchBoot();
  watchUnavailable();
}

export default defineContentScript({
  matches: [`${GLIC_URL}*`],
  runAt: "document_start",
  world: "MAIN",
  main() {
    installBidi();
    captureBootstrapListeners();
    bridgeMessenger.onMessage(BridgeMessage.ACTIVATE, ({ data }) => activate(data));
    bridgeMessenger.onMessage(GlicCommand.START_LIVE, startLive);
    bridgeMessenger.onMessage(GlicCommand.STOP_LIVE, stopLive);
    bridgeMessenger.onMessage(GlicCommand.BEGIN_TEXT, beginText);
    bridgeMessenger.onMessage(GlicCommand.SUBMIT, submitAndRead);
    bridgeMessenger.onMessage(GlicCommand.SET_MIC, ({ data }) => setMic(data));
    void bridgeMessenger
      .sendMessage(BridgeMessage.PRESENT)
      .then(activation => activation && activate(activation))
      .catch(() => {});
  }
});
