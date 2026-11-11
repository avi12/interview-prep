import { browserStorage, readStored, writeStored } from "@/lib/browser-storage.ts";
import { z } from "@/lib/zod.ts";

const GEMINI_KEY_STORAGE_KEY = "interview-prep.gemini-api-key";
const MIN_API_KEY_LENGTH = 20;

export const apiKeySchema = z.string().trim().min(MIN_API_KEY_LENGTH).regex(/^\S+$/);

const storedKeySchema = z.object({ apiKey: apiKeySchema.nullable() });

export function loadGeminiKey() {
  return readStored({
    storage: browserStorage(),
    key: GEMINI_KEY_STORAGE_KEY,
    schema: storedKeySchema,
    fallback: {
      apiKey: null
    }
  }).apiKey;
}

export function saveGeminiKey(candidate: string) {
  const parsed = apiKeySchema.safeParse(candidate);
  if (!parsed.success) {
    return false;
  }

  return writeStored({
    storage: browserStorage(),
    key: GEMINI_KEY_STORAGE_KEY,
    value: {
      apiKey: parsed.data
    }
  });
}

export function clearGeminiKey() {
  return writeStored({
    storage: browserStorage(),
    key: GEMINI_KEY_STORAGE_KEY,
    value: {
      apiKey: null
    }
  });
}
