import { DEFAULT_LANGUAGE, type Language, languageSchema } from "@/lib/language.ts";

const LANGUAGE_STORAGE_KEY = "interview-prep-voice-language";

export function loadStoredLanguage() {
  try {
    const parsed = languageSchema.safeParse(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    return parsed.success ? parsed.data : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function storeLanguage(language: Language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    return;
  }
}
