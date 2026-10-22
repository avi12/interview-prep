import { DEFAULT_LANGUAGE, type Language, languageSchema } from "./language.ts";
import { storage } from "#imports";

const languageItem = storage.defineItem<unknown>("local:language", { fallback: DEFAULT_LANGUAGE });

export async function loadLanguage() {
  const parsed = languageSchema.safeParse(await languageItem.getValue());
  return parsed.success ? parsed.data : DEFAULT_LANGUAGE;
}

export function saveLanguage(language: Language) {
  return languageItem.setValue(language);
}
