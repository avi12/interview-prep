import { z } from "@/lib/zod.ts";
import {
  API_KEY_PATH,
  apiKeyResponseSchema,
  type ApiKeyUpdate,
  VOICE_SETUP_PATH,
  voiceSetupSchema
} from "@scripts/lib/voice.ts";

const JSON_HEADERS = { "content-type": "application/json" };
const HttpMethod = {
  PUT: "PUT",
  DELETE: "DELETE"
} as const;

async function getJson<T>({ path, schema }: {
  path: string;
  schema: z.ZodType<T>;
}) {
  const response = await fetch(path).catch(() => null);
  if (!response?.ok) {
    return null;
  }

  const parsed = schema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data : null;
}

export function loadApiKey() {
  return getJson({
    path: API_KEY_PATH,
    schema: apiKeyResponseSchema
  });
}

export async function saveApiKey(update: ApiKeyUpdate) {
  const response = await fetch(API_KEY_PATH, {
    method: HttpMethod.PUT,
    headers: JSON_HEADERS,
    body: JSON.stringify(update)
  }).catch(() => null);
  return !!response?.ok;
}

export async function removeApiKey() {
  const response = await fetch(API_KEY_PATH, { method: HttpMethod.DELETE }).catch(() => null);
  return !!response?.ok;
}

export function loadVoiceSetup() {
  return getJson({
    path: VOICE_SETUP_PATH,
    schema: voiceSetupSchema
  });
}
