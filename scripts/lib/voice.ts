import { zod } from "./zod.ts";

export const VOICE_PATH = "/voice/";
export const API_KEY_PATH = "/api-key";
export const VOICE_SETUP_PATH = "/voice-setup";
export const API_KEY_ENV = "GEMINI_API_KEY";
export const VOICE_STATUS_ITEM_ID = "voiceTutor";
export const VOICE_BUILD_RELATIVE_DIR = "apps/gemini-live/.output-voice";
export const EXTENSION_BUILD_RELATIVE_DIR = "apps/gemini-live/.output/chrome-mv3";
export const EXTENSION_BUILD_COMMAND = "pnpm --filter @interview-prep/gemini-live build";
export const VOICE_BUILD_COMMAND = "pnpm --filter @interview-prep/gemini-live build:voice";
export const API_KEY_CREATE_URL = "https://aistudio.google.com/apikey";
export const API_PRICING_URL = "https://ai.google.dev/gemini-api/docs/pricing";

export const ApiKeySource = {
  ENV: "env",
  SAVED: "saved",
  NONE: "none"
} as const;

export const apiKeyResponseSchema = zod.object({
  key: zod.string(),
  source: zod.enum(ApiKeySource)
});
export type ApiKeyResponse = zod.infer<typeof apiKeyResponseSchema>;

export const apiKeyUpdateSchema = zod.object({ key: zod.string().trim().min(1) });
export type ApiKeyUpdate = zod.infer<typeof apiKeyUpdateSchema>;

export const voiceSetupSchema = zod.object({
  extensionPath: zod.string(),
  buildCommand: zod.string()
});
export type VoiceSetup = zod.infer<typeof voiceSetupSchema>;
