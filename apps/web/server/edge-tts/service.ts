import { type Synthesize, synthesize } from "@server/edge-tts/client.ts";
import { createVoiceCatalog } from "@server/edge-tts/voices.ts";

import type { Voice } from "#scripts/lib/edge-tts/voice.ts";

export interface EdgeTts {
  listVoices: () => Promise<Voice[]>;
  synthesize: Synthesize;
}

export function createEdgeTts() {
  return {
    listVoices: createVoiceCatalog(),
    synthesize
  } satisfies EdgeTts;
}
