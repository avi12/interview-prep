import type { ApiKeyStore } from "@/apiKey.ts";
import { voiceUrl } from "@scripts/lib/server.ts";
import { API_KEY_CREATE_URL, API_KEY_ENV, ApiKeySource, VOICE_STATUS_ITEM_ID } from "@scripts/lib/voice.ts";
import * as vscode from "vscode";

const VoiceCommand = {
  openVoiceTutor: "interviewPrep.openVoiceTutor",
  setGeminiApiKey: "interviewPrep.setGeminiApiKey",
  clearGeminiApiKey: "interviewPrep.clearGeminiApiKey"
} as const;

const STATUS_ITEM_PRIORITY = 100;
const STATUS_ITEM_NAME = "Voice tutor";

function createVoiceStatusItem() {
  const { Right } = vscode.StatusBarAlignment;
  const item = vscode.window.createStatusBarItem(VOICE_STATUS_ITEM_ID, Right, STATUS_ITEM_PRIORITY);
  item.name = STATUS_ITEM_NAME;
  item.text = "$(mic) Voice tutor";
  item.tooltip = "Open the Gemini Live voice tutor, a spoken coach that sees your lesson and your code";
  item.command = VoiceCommand.openVoiceTutor;
  item.show();
  return item;
}

function openVoiceTutor() {
  return vscode.env.openExternal(vscode.Uri.parse(voiceUrl()));
}

async function setGeminiApiKey(store: ApiKeyStore) {
  const key = await vscode.window.showInputBox({
    title: "Gemini API key",
    prompt: `Paste a Gemini API key from ${API_KEY_CREATE_URL}. It is kept in VS Code's secret storage`,
    password: true,
    ignoreFocusOut: true,
    validateInput: value => value.trim() ? undefined : "Paste a key, or press Escape to cancel"
  });
  if (!key?.trim()) {
    return;
  }

  const { source } = await store.save(key);
  if (source === ApiKeySource.ENV) {
    return vscode.window.showWarningMessage(`Saved, but the ${API_KEY_ENV} environment variable is set and takes precedence`);
  }

  return vscode.window.showInformationMessage("Gemini API key saved");
}

async function clearGeminiApiKey(store: ApiKeyStore) {
  const { source } = await store.clear();
  if (source === ApiKeySource.ENV) {
    return vscode.window.showWarningMessage(`Saved key cleared. The ${API_KEY_ENV} environment variable is still set and is used instead`);
  }

  return vscode.window.showInformationMessage("Gemini API key cleared");
}

export function registerVoiceTutor(store: ApiKeyStore) {
  return [
    createVoiceStatusItem(),
    vscode.commands.registerCommand(VoiceCommand.openVoiceTutor, openVoiceTutor),
    vscode.commands.registerCommand(VoiceCommand.setGeminiApiKey, () => setGeminiApiKey(store)),
    vscode.commands.registerCommand(VoiceCommand.clearGeminiApiKey, () => clearGeminiApiKey(store))
  ];
}
