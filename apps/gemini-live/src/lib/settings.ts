import { DEFAULT_LANGUAGE, type Language, languageSchema } from "./language.ts";
import { DEFAULT_MIC_KEY, type MicKey, micKeySchema } from "./mic-key-choice.ts";
import { storage } from "#imports";

const languageItem = storage.defineItem<unknown>("local:language", { fallback: DEFAULT_LANGUAGE });
export const micKeyItem = storage.defineItem<unknown>("local:micKey", { fallback: DEFAULT_MIC_KEY });

export async function loadLanguage() {
  const parsed = languageSchema.safeParse(await languageItem.getValue());
  return parsed.success ? parsed.data : DEFAULT_LANGUAGE;
}

export function saveLanguage(language: Language) {
  return languageItem.setValue(language);
}

export function parseMicKey(raw: unknown) {
  const parsed = micKeySchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_MIC_KEY;
}

export async function loadMicKey() {
  return parseMicKey(await micKeyItem.getValue());
}

export function saveMicKey(micKey: MicKey) {
  return micKeyItem.setValue(micKey);
}
