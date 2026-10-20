import { browser } from "wxt/browser";
import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
import { LANGUAGE_LABEL, languageSchema } from "@/lib/language.ts";
import { isRunning } from "@/lib/live-state.ts";
import { sessionText, sessionTone } from "@/lib/live-status.ts";
import { parseSession, sessionItem, type Session } from "@/lib/session.ts";
import { loadLanguage, saveLanguage } from "@/lib/settings.ts";
import { findVscodeTab, VSCODE_ORIGIN } from "@/lib/vscode.ts";
import "./style.css";

const IDLE = "idle";

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
  return sessionText(session);
};

const render = () => {
  elApp.dataset.state = view.session?.state ?? IDLE;
  elChip.textContent = view.session?.state ?? IDLE;
  elChip.dataset.tone = sessionTone(view.session);
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
