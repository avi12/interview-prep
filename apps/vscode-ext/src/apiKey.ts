import { API_KEY_ENV, type ApiKeyResponse, ApiKeySource } from "@scripts/lib/voice.ts";
import type { SecretStorage } from "vscode";

const SECRET_NAME = "interviewPrep.geminiApiKey";

export function resolveApiKey({ envKey, savedKey }: {
  envKey: string | undefined;
  savedKey: string | undefined;
}): ApiKeyResponse {
  const trimmedEnvKey = envKey?.trim();
  if (trimmedEnvKey) {
    return {
      key: trimmedEnvKey,
      source: ApiKeySource.ENV
    };
  }

  if (savedKey) {
    return {
      key: savedKey,
      source: ApiKeySource.SAVED
    };
  }

  return {
    key: "",
    source: ApiKeySource.NONE
  };
}

export function createApiKeyStore(secrets: SecretStorage) {
  async function read() {
    return resolveApiKey({
      envKey: process.env[API_KEY_ENV],
      savedKey: await secrets.get(SECRET_NAME)
    });
  }

  async function save(key: string) {
    await secrets.store(SECRET_NAME, key.trim());
    return read();
  }

  async function clear() {
    await secrets.delete(SECRET_NAME);
    return read();
  }

  return {
    read,
    save,
    clear
  };
}

export type ApiKeyStore = ReturnType<typeof createApiKeyStore>;
