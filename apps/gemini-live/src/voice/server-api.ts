import {
  API_KEY_PATH,
  apiKeyResponseSchema,
  type ApiKeyUpdate,
  apiKeyUpdateSchema,
  VOICE_SETUP_PATH,
  voiceSetupSchema
} from "@scripts/lib/voice.ts";

import { fetchParsed } from "@/lib/fetch-parsed.ts";
import type { zod } from "@/lib/zod.ts";

const JSON_HEADERS = { "content-type": "application/json" };
const HttpMethod = {
  GET: "GET",
  PUT: "PUT",
  DELETE: "DELETE"
} as const;
type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

async function requestJson<T>({
  path,
  schema,
  method = HttpMethod.GET,
  body
}: {
  path: string;
  schema: zod.ZodType<T>;
  method?: HttpMethod;
  body?: unknown;
}) {
  const init: RequestInit =
    body === undefined
      ? { method }
      : {
          method,
          headers: JSON_HEADERS,
          body: JSON.stringify(body)
        };
  return fetchParsed({
    input: path,
    init,
    schema
  });
}

export function loadApiKey() {
  return requestJson({
    path: API_KEY_PATH,
    schema: apiKeyResponseSchema
  });
}

export function saveApiKey(update: ApiKeyUpdate) {
  const parsed = apiKeyUpdateSchema.safeParse(update);
  if (!parsed.success) {
    return Promise.resolve(null);
  }

  return requestJson({
    path: API_KEY_PATH,
    schema: apiKeyResponseSchema,
    method: HttpMethod.PUT,
    body: parsed.data
  });
}

export function removeApiKey() {
  return requestJson({
    path: API_KEY_PATH,
    schema: apiKeyResponseSchema,
    method: HttpMethod.DELETE
  });
}

export function loadVoiceSetup() {
  return requestJson({
    path: VOICE_SETUP_PATH,
    schema: voiceSetupSchema
  });
}
