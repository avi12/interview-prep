import { browser } from "wxt/browser";
import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
import { LANGUAGE_LABEL, languageSchema } from "@/lib/language.ts";
import { isRunning, LiveState, Sight } from "@/lib/live-state.ts";
import { parseSession, sessionItem, type Session } from "@/lib/session.ts";
import { loadLanguage, saveLanguage } from "@/lib/settings.ts";
import { findVscodeTab, VSCODE_ORIGIN } from "@/lib/vscode.ts";
import "./style.css";

const Tone = {
  OK: "ok",
  WARN: "warn",
  DANGER: "danger",
  IDLE: "idle"
} as const;
type Tone = (typeof Tone)[keyof typeof Tone];

const IDLE = "idle";

const STATE_TEXT: Record<LiveState, string> = {
  [LiveState.OPENING]: "Opening the Gemini window",
  [LiveState.BRIEFING]: "Briefing your tutor",
  [LiveState.LIVE]: "Gemini is listening and watching your VS Code",
  [LiveState.PAUSED]: "Gemini paused, bringing it back",
  [LiveState.RECONNECTING]: "Gemini dropped, reconnecting",
  [LiveState.FAILED]: "Gemini could not start"
};

const STATE_TONE: Record<LiveState, Tone> = {
  [LiveState.OPENING]: Tone.WARN,
  [LiveState.BRIEFING]: Tone.WARN,
  [LiveState.LIVE]: Tone.OK,
  [LiveState.PAUSED]: Tone.WARN,
  [LiveState.RECONNECTING]: Tone.WARN,
  [LiveState.FAILED]: Tone.DANGER
};

const HIDDEN_TEXT = "Gemini is listening but cannot see VS Code, bring its tab to the front";
const READY_TEXT = "Ready when you are";
const NEEDS_VSCODE_TEXT = `Open VS Code at ${VSCODE_ORIGIN} to begin`;

const required = <T extends Element>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`the popup is missing ${selector}`);
  return element;
};

const elApp = required<HTMLElement>("main");
const elChip = required<HTMLElement>("#chip");
const elStatus = required<HTMLOutputElement>("#status");
const elNote = required<HTMLElement>("#note");
const elLanguage = required<HTMLSelectElement>("#language");
const elStart = required<HTMLButtonElement>("#start");
const elStop = required<HTMLButtonElement>("#stop");

const view = {
  session: null as Session | null,
  isVscodeOpen: false,
  note: ""
};

const isSessionRunning = () => !!view.session && isRunning(view.session.state);
const isStartable = () => view.isVscodeOpen && !isSessionRunning();

const statusText = () => {
  const { session } = view;
  if (!session) return view.isVscodeOpen ? READY_TEXT : NEEDS_VSCODE_TEXT;
  if (session.state === LiveState.FAILED) return session.detail || STATE_TEXT[LiveState.FAILED];
  if (session.state === LiveState.LIVE && session.sight === Sight.HIDDEN) return HIDDEN_TEXT;
  return STATE_TEXT[session.state];
};

const tone = () => {
  const { session } = view;
  if (!session) return Tone.IDLE;
  if (session.state === LiveState.LIVE && session.sight === Sight.HIDDEN) return Tone.WARN;
  return STATE_TONE[session.state];
};

const render = () => {
  elApp.dataset.state = view.session?.state ?? IDLE;
  elChip.textContent = view.session?.state ?? IDLE;
  elChip.dataset.tone = tone();
  elStatus.textContent = statusText();
  elNote.textContent = view.note;
  elStart.disabled = !isStartable();
  elStop.hidden = !view.session;
};

const refreshVscode = async () => {
  view.isVscodeOpen = !!(await findVscodeTab());
  render();
};

const start = async () => {
  if (!isStartable()) return;
  const result = await extensionMessenger
    .sendMessage(ExtensionMessage.LIVE_START)
    .catch((error: Error) => ({ isStarted: false, detail: error.message }));
  view.note = result.isStarted ? "" : result.detail;
  render();
};

const stop = async () => {
  view.note = "";
  await extensionMessenger.sendMessage(ExtensionMessage.LIVE_STOP);
};

const fillLanguages = async () => {
  for (const [value, label] of Object.entries(LANGUAGE_LABEL)) elLanguage.append(new Option(label, value));
  elLanguage.value = await loadLanguage();
};

elStart.addEventListener("click", start);
elStop.addEventListener("click", stop);
elLanguage.addEventListener("change", () => {
  const parsedLanguage = languageSchema.safeParse(elLanguage.value);
  if (parsedLanguage.success) void saveLanguage(parsedLanguage.data);
});

sessionItem.watch(raw => {
  view.session = parseSession(raw);
  render();
});
for (const event of [browser.tabs.onCreated, browser.tabs.onRemoved, browser.tabs.onUpdated]) event.addListener(refreshVscode);

view.session = parseSession(await sessionItem.getValue());
await fillLanguages();
await refreshVscode();
