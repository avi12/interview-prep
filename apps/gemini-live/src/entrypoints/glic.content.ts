import { defineContentScript } from "#imports";
import { installBidi } from "@/lib/bidi.ts";
import { bridgeMessenger, BridgeMessage } from "@/lib/bridge-channel.ts";
import type { BridgeReport } from "@/lib/bridge-report.ts";
import { BridgeCall, BridgeFailure, BridgeUp, GLIC_URL, GlicState, type Activation, type Frame } from "@/lib/bridge-vocab.ts";
import { within } from "@/lib/within.ts";

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
const HostCapability = { MULTI_INSTANCE: 3, PDF_ZERO_STATE: 7, INVOKE: 8 } as const;

const TAB_ID = "vscode";
const PANEL_STATE = { kind: PanelStateKind.ATTACHED, windowId: TAB_ID };
const FAKE_CHROME_VERSION = { major: 130, minor: 0, build: 0, patch: 0 };
const SHARED_TAB_TITLE = "VS Code";
const USER_NAME = "You";

const BOOT_POLL_MS = 100;
const MAX_BOOT_TRIES = 150;
const UNAVAILABLE_POLL_MS = 500;
const START_POLL_MS = 300;
const MAX_START_TRIES = 100;
const MONITOR_POLL_MS = 300;
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
  "45681081": DAY_SECONDS,
  "45681082": DAY_SECONDS,
  "45687231": DAY_SECONDS * 1000,
  "45677155": DAY_SECONDS * 1000
};

const MIC_QUALITY_CONSTRAINTS = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, voiceIsolation: true };
const REPLY_SELECTORS = "message-content, .model-response-text, .markdown, [data-response-index]";

type Json = Record<string, unknown>;
type Subscriber = (value: unknown) => void;
type Timer = ReturnType<typeof setInterval> | undefined;

const bridge = {
  isActive: false,
  isActivated: false,
  isBooted: false,
  isUnavailableReported: false,
  isBrokenReported: false,
  isConsentAccepted: false,
  isTimeoutsPatched: false,
  lastState: null as GlicState | null,
  lastResume: 0,
  resumeTries: 0,
  lastLive: 0,
  lastTryAgain: 0,
  monitorTimer: undefined as Timer,
  startTimer: undefined as Timer,
  focusedTab: {
    tabId: TAB_ID,
    url: "",
    title: SHARED_TAB_TITLE,
    faviconUrl: "",
    documentMimeType: "text/html",
    isMediaActive: false
  } as Json
};

const bootstrapHandlers: EventListener[] = [];

const report = (message: BridgeReport) => {
  void bridgeMessenger.sendMessage(BridgeMessage.REPORT, message).catch(() => {});
};

const setState = (state: GlicState) => {
  if (bridge.lastState === state) return;
  bridge.lastState = state;
  report({ kind: BridgeUp.STATE, state });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const pageText = () => document.body?.innerText ?? "";
const pageSays = (phrase: string) => pageText().includes(phrase);

const findButton = (...fragments: string[]) => {
  const buttons = [...document.querySelectorAll("button")];
  for (const fragment of fragments) {
    const found = buttons.find(button => (button.getAttribute("aria-label") ?? "").includes(fragment));
    if (found) return found;
  }
  return null;
};

const clickButton = (...fragments: string[]) => {
  const button = findButton(...fragments);
  button?.click();
  return !!button;
};

const isSignedOut = () => {
  if (location.hostname === ACCOUNTS_HOST) return true;
  return SIGN_IN.test(pageText()) && !findButton(Button.GO_LIVE);
};

const reportFailure = (failure: BridgeFailure) => report({ kind: BridgeUp.ERROR, failure });

const reportStartFailure = (fallback: BridgeFailure) => reportFailure(isSignedOut() ? BridgeFailure.SIGNED_OUT : fallback);

const decodeFrame = (frame: Frame | null) => {
  if (!frame?.base64) return null;
  const bytes = Uint8Array.from(atob(frame.base64), char => char.charCodeAt(0));
  return { data: bytes.buffer, mimeType: frame.mimeType, widthPixels: frame.width, heightPixels: frame.height };
};

const captureFrame = async () => {
  if (!bridge.isActive) return null;
  const frame = await within({ ms: FRAME_TIMEOUT_MS, promise: bridgeMessenger.sendMessage(BridgeMessage.CAPTURE), fallback: null });
  return decodeFrame(frame);
};

const notify = ({ subscriber, value }: { subscriber: Subscriber; value: unknown }) => {
  try {
    subscriber(value);
  } catch {
    /* a subscriber's error is its own */
  }
};

const observable = (value: unknown) => ({
  subscribe(change: Subscriber) {
    notify({ subscriber: change, value });
    return { unsubscribe() {} };
  }
});

const resolved = (value: unknown) => () => Promise.resolve(value);
const captions = observable(true);

const host: Json = {
  getChromeVersion: resolved(FAKE_CHROME_VERSION),
  getPlatform: () => Platform.LINUX,
  getFormFactor: () => FormFactor.DESKTOP,
  getHostCapabilities: () => new Set([HostCapability.MULTI_INSTANCE, HostCapability.PDF_ZERO_STATE, HostCapability.INVOKE]),
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
  getFocusedTabStateV2: () => observable({ hasFocus: { tabData: bridge.focusedTab } }),
  getContextFromFocusedTab: () => Promise.resolve({ tabData: bridge.focusedTab }),
  captureScreenshot: () => captureFrame(),
  async getContextFromTab(_tabId: unknown, options?: { viewportScreenshot?: boolean }) {
    const context: Json = { tabData: bridge.focusedTab };
    if (!options?.viewportScreenshot) return context;
    const shot = await captureFrame();
    if (!shot) return context;
    context.viewportScreenshot = shot;
    context.screenshotInfo = { widthPixels: shot.widthPixels, heightPixels: shot.heightPixels };
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
        report({ kind: BridgeUp.BOOTED });
        setTimeout(() => notify({ subscriber: state => client.notifyPanelWillOpen?.(state), value: PANEL_STATE }), 0);
      })
};

const bootstrapEvent = () =>
  new MessageEvent("message", {
    origin: "chrome://glic",
    source: window,
    data: { type: "glic-bootstrap", glicApiSource: "data:text/javascript,//vscode" }
  });

const tryBootstrap = () => {
  if (bridge.isBooted || !bridge.isActivated) return;
  for (const handler of bootstrapHandlers) notify({ subscriber: handler as Subscriber, value: bootstrapEvent() });
};

const captureBootstrapListeners = () => {
  const originalAdd = EventTarget.prototype.addEventListener;
  Object.defineProperty(window, "addEventListener", {
    configurable: true,
    writable: true,
    value(type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions) {
      if (type === "message" && typeof listener === "function") bootstrapHandlers.push(listener);
      originalAdd.call(window, type, listener, options);
    }
  });
};

const patchVisibility = () => {
  try {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.addEventListener("visibilitychange", event => event.stopImmediatePropagation(), true);
  } catch {
    /* the page froze these; it keeps its own visibility */
  }
};

const patchMic = () => {
  try {
    const media = navigator.mediaDevices;
    const getUserMedia = media.getUserMedia.bind(media);
    media.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      if (!constraints) return getUserMedia(constraints);
      const { video, ...rest } = constraints;
      if (video && !rest.audio) throw new DOMException("the camera is not shared", "NotAllowedError");
      if (!rest.audio) return getUserMedia(rest);
      const asked = rest.audio === true ? {} : rest.audio;
      return getUserMedia({ ...rest, audio: { ...asked, ...MIC_QUALITY_CONSTRAINTS } as MediaTrackConstraints });
    };
  } catch {
    /* frozen mediaDevices: the client captures with its own settings */
  }
};

const patchLiveTimeouts = () => {
  if (bridge.isTimeoutsPatched) return true;
  const flags = (window as unknown as { default_BardChatUi?: Record<string, unknown> }).default_BardChatUi;
  if (!flags) return false;
  let found = 0;
  for (const flag of Object.values(flags)) {
    const entry = flag as { key?: string; defaultValue?: unknown; ctor?: () => unknown } | null;
    const value = entry && typeof entry === "object" && entry.key ? LIVE_TIMEOUT_FLAGS[entry.key] : undefined;
    if (value === undefined || !entry) continue;
    entry.defaultValue = value;
    entry.ctor = () => value;
    found++;
  }
  bridge.isTimeoutsPatched = found === Object.keys(LIVE_TIMEOUT_FLAGS).length;
  return bridge.isTimeoutsPatched;
};

const markBroken = () => {
  if (bridge.isBrokenReported) return;
  bridge.isBrokenReported = true;
  reportFailure(BridgeFailure.LIVE_BROKE);
};

const resume = () => {
  const now = Date.now();
  if (now - bridge.lastResume < RESUME_GAP_MS * (bridge.resumeTries + 1)) return;
  if (++bridge.resumeTries > MAX_RESUME_TRIES) return markBroken();
  bridge.lastResume = now;
  clickButton(...RESUME_BUTTONS);
};

const tryAgainButton = () =>
  [...document.querySelectorAll("button")].find(button =>
    `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`.includes(Button.TRY_AGAIN)
  );

const monitorTick = () => {
  if (!bridge.isActive) return;
  const now = Date.now();
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
  if (now - bridge.lastLive > BROKEN_AFTER_MS) markBroken();
};

const advanceToLive = () => {
  const ok = findButton(Button.CONFIRM_OK);
  if (ok && findButton(Button.NO_THANKS) && pageSays(Phrase.MIC_CONSENT)) {
    ok.click();
    bridge.isConsentAccepted = true;
    return;
  }
  const skip = findButton(Button.SKIP);
  if (skip && findButton(Button.GO_BACK) && findButton(Button.TURN_ON_CAPTIONS)) return skip.click();
  if (clickButton(Button.START_LIVE) || bridge.isConsentAccepted) return;
  clickButton(Button.GO_LIVE);
};

const startLive = () => {
  bridge.isActive = true;
  bridge.lastState = null;
  bridge.isConsentAccepted = false;
  bridge.resumeTries = 0;
  clearInterval(bridge.startTimer);
  let tries = 0;
  bridge.startTimer = setInterval(() => {
    if (!bridge.isActive || bridge.isUnavailableReported) return clearInterval(bridge.startTimer);
    tryBootstrap();
    if (!patchLiveTimeouts() && tries < MAX_START_TRIES / 2) {
      tries++;
      return;
    }
    if (findButton(Button.PAUSE_LIVE)) {
      clearInterval(bridge.startTimer);
      bridge.lastLive = Date.now();
      bridge.isBrokenReported = false;
      report({ kind: BridgeUp.READY });
      setState(GlicState.LISTENING);
      bridge.monitorTimer ??= setInterval(monitorTick, MONITOR_POLL_MS);
      return;
    }
    advanceToLive();
    if (++tries <= MAX_START_TRIES) return;
    clearInterval(bridge.startTimer);
    reportStartFailure(BridgeFailure.LIVE_DID_NOT_START);
  }, START_POLL_MS);
  return true;
};

const stopLive = () => {
  bridge.isActive = false;
  clearInterval(bridge.startTimer);
  clickButton(Button.TEXT_MODE, Button.PAUSE_LIVE, Button.END);
  setState(GlicState.IDLE);
  return true;
};

const waitFor = async <T>({ predicate, ms }: { predicate: () => T | null | undefined; ms: number }) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const value = predicate();
    if (value) return value;
    await sleep(WAIT_POLL_MS);
  }
  return null;
};

const textBox = () => document.querySelector<HTMLElement>('[contenteditable="true"]');

const lastReply = () => {
  const replies = document.querySelectorAll<HTMLElement>(".presented-response-container");
  const last = replies[replies.length - 1];
  if (last) return last;
  const nodes = document.querySelectorAll<HTMLElement>(REPLY_SELECTORS);
  return nodes[nodes.length - 1] ?? null;
};

const beginText = async () => {
  bridge.isActive = false;
  clearInterval(bridge.startTimer);
  clearInterval(bridge.monitorTimer);
  bridge.monitorTimer = undefined;
  clickButton(Button.TEXT_MODE);
  const box = await waitFor({ predicate: textBox, ms: TEXT_READY_MS });
  if (!box) return false;
  box.focus();
  document.execCommand("selectAll");
  document.execCommand("delete");
  return true;
};

const submitAndRead = async () => {
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
      if (Date.now() - stableSince > SETTLE_MS) return true;
    }
    await sleep(REPLY_POLL_MS);
  }
  if (clickButton(Button.STOP_RESPONSE)) await sleep(SETTLE_MS);
  return false;
};

const calls: Record<BridgeCall, () => unknown> = {
  [BridgeCall.START]: startLive,
  [BridgeCall.STOP]: stopLive,
  [BridgeCall.BEGIN_TEXT]: beginText,
  [BridgeCall.SUBMIT]: submitAndRead
};

const watchBoot = () => {
  let tries = 0;
  const bootTimer = setInterval(() => {
    tryBootstrap();
    if (!bridge.isBooted && ++tries <= MAX_BOOT_TRIES) return;
    clearInterval(bootTimer);
    const isAlreadyExplained = bridge.isBooted || bridge.isUnavailableReported;
    if (!isAlreadyExplained) reportStartFailure(BridgeFailure.PAGE_DID_NOT_START);
  }, BOOT_POLL_MS);
};

const watchUnavailable = () => {
  const timer = setInterval(() => {
    if (!pageSays(Phrase.UNAVAILABLE)) return;
    clearInterval(timer);
    bridge.isUnavailableReported = true;
    reportFailure(BridgeFailure.UNAVAILABLE);
  }, UNAVAILABLE_POLL_MS);
};

const activate = ({ title, url }: Activation) => {
  bridge.focusedTab = { ...bridge.focusedTab, title, url: url || location.origin };
  if (bridge.isActivated) return;
  bridge.isActivated = true;
  patchVisibility();
  patchMic();
  (window as unknown as { internalAutoGlicBoot?: () => unknown }).internalAutoGlicBoot = () => registry;
  watchBoot();
  watchUnavailable();
};

export default defineContentScript({
  matches: [`${GLIC_URL}*`],
  runAt: "document_start",
  world: "MAIN",

  main() {
    installBidi();
    captureBootstrapListeners();
    bridgeMessenger.onMessage(BridgeMessage.ACTIVATE, ({ data }) => activate(data));
    bridgeMessenger.onMessage(BridgeMessage.CALL, async ({ data }) => {
      const run = calls[data.name];
      return run ? await Promise.resolve(run()).catch(() => null) : null;
    });
    void bridgeMessenger
      .sendMessage(BridgeMessage.PRESENT)
      .then(activation => activation && activate(activation))
      .catch(() => {});
  }
});
