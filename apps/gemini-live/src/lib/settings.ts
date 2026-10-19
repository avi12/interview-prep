import { storage } from "#imports";
import { DEFAULT_LANGUAGE, languageSchema, type Language } from "./language.ts";

const languageItem = storage.defineItem<unknown>("local:language", { fallback: DEFAULT_LANGUAGE });

export const loadLanguage = async () => {
  const parsed = languageSchema.safeParse(await languageItem.getValue());
  return parsed.success ? parsed.data : DEFAULT_LANGUAGE;
};

export const saveLanguage = (language: Language) => languageItem.setValue(language);
