import { z } from "./zod.ts";

export const Language = {
  ENGLISH: "en",
  HEBREW: "he"
} as const;
export type Language = (typeof Language)[keyof typeof Language];

export const DEFAULT_LANGUAGE = Language.ENGLISH;

export const languageSchema = z.enum(Language);

export const LANGUAGE_LABEL: Record<Language, string> = {
  [Language.ENGLISH]: "English",
  [Language.HEBREW]: "Hebrew (עברית)"
};
