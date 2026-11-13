import { TRUSTED_CLIENT_TOKEN, VOICES_TOKEN_PARAMETER, VOICES_URL } from "#scripts/lib/edge-tts/constants.ts";
import { type Voice, voicesSchema } from "#scripts/lib/edge-tts/voice.ts";

async function fetchVoices() {
  const parameters = new URLSearchParams({ [VOICES_TOKEN_PARAMETER]: TRUSTED_CLIENT_TOKEN });
  const response = await fetch(`${VOICES_URL}?${parameters}`);
  if (!response.ok) {
    throw new Error(`Couldn't get the voice list (${response.status})`);
  }

  return voicesSchema.parse(await response.json());
}

export function createVoiceCatalog() {
  let cached: Promise<Voice[]> | null = null;
  return function listVoices() {
    cached ??= fetchVoices().catch((error: unknown) => {
      cached = null;
      throw error;
    });
    return cached;
  };
}
