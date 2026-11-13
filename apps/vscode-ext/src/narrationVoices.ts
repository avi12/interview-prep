import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  NARRATION_HOST_RELATIVE_DIR,
  NARRATION_SERVICE_FILE_NAME,
  VOICE_RECORDINGS_RELATIVE_DIR
} from "@scripts/lib/layout.ts";
import {
  NarrationAction,
  type NarrationReply,
  type NarrationRequest,
  recordingSchema,
  voiceSchema
} from "@scripts/lib/narration-host.ts";
import { zod } from "@scripts/lib/zod.ts";
import type { Memento } from "vscode";

const VOICE_STATE_KEY = "interviewPrep.narrationVoice";
const RECORDING_NAME_LENGTH = 16;
const MISSING_SERVICE = "The narration tool is not built. Run pnpm start again to record other voices";

const asyncFunctionSchema = zod.custom<(...args: unknown[]) => Promise<unknown>>(value => typeof value === "function");
const serviceSchema = zod.object({
  listVoices: asyncFunctionSchema,
  recordVoice: asyncFunctionSchema
});
const voicesSchema = zod.array(voiceSchema);

function recordingPath({ root, voice, text }: { root: string; voice: string; text: string }) {
  const name = createHash("sha1").update(text).digest("hex").slice(0, RECORDING_NAME_LENGTH);
  return resolve(root, VOICE_RECORDINGS_RELATIVE_DIR, voice, `${name}.json`);
}

async function readRecording(path: string) {
  if (!existsSync(path)) {
    return null;
  }

  const parsed = recordingSchema.safeParse(JSON.parse(await readFile(path, "utf8")));
  return parsed.success ? parsed.data : null;
}

export function createNarrationVoices({ root, state }: { root: string; state: Memento }) {
  let serviceRequest: Promise<zod.infer<typeof serviceSchema>> | null = null;

  async function importService() {
    const path = resolve(root, NARRATION_HOST_RELATIVE_DIR, NARRATION_SERVICE_FILE_NAME);
    if (!existsSync(path)) {
      throw new Error(MISSING_SERVICE);
    }

    return serviceSchema.parse(await import(pathToFileURL(path).href));
  }

  function loadService() {
    serviceRequest ??= importService().catch((error: unknown) => {
      serviceRequest = null;
      throw error;
    });
    return serviceRequest;
  }

  async function record({ voice, text }: { voice: string; text: string }) {
    const path = recordingPath({
      root,
      voice,
      text
    });
    const saved = await readRecording(path);
    if (saved) {
      return saved;
    }

    const service = await loadService();
    const recording = recordingSchema.parse(
      await service.recordVoice({
        text,
        voice
      })
    );
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(recording));
    return recording;
  }

  async function answer(request: NarrationRequest) {
    switch (request.action) {
      case NarrationAction.VOICES:
        return voicesSchema.parse(await (await loadService()).listVoices());
      case NarrationAction.VOICE:
        return state.get<string>(VOICE_STATE_KEY) ?? null;
      case NarrationAction.SET_VOICE:
        await state.update(VOICE_STATE_KEY, request.voice);
        return null;
      case NarrationAction.RECORD:
        return record(request);
    }
  }

  return async function reply(request: NarrationRequest) {
    try {
      return {
        narrationReply: request.request,
        value: await answer(request)
      } satisfies NarrationReply;
    } catch (error) {
      return {
        narrationReply: request.request,
        error: error instanceof Error ? error.message : String(error)
      } satisfies NarrationReply;
    }
  };
}
