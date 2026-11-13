import { setTimeout as delay } from "node:timers/promises";

import type { EdgeTts } from "@server/edge-tts/service.ts";
import { type Log, Severity } from "@server/logging.ts";

import { AUDIO_MIME_TYPE } from "#scripts/lib/edge-tts/constants.ts";
import type { WordBoundary } from "#scripts/lib/edge-tts/protocol.ts";
import { parseNarrationScript } from "#scripts/lib/edge-tts/script.ts";
import { getVoiceLocale, sanitizeText } from "#scripts/lib/edge-tts/ssml.ts";
import { createWordLocator } from "#scripts/lib/edge-tts/words.ts";
import { encodeFrame, FrameKind, type NarrationWord } from "#scripts/lib/narration-stream.ts";

export const MAX_SOCKET_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function narrationStream({
  edgeTts,
  script,
  voice,
  log
}: {
  edgeTts: EdgeTts;
  script: string;
  voice: string;
  log: Log;
}) {
  const { text, cues } = parseNarrationScript(script);
  const abort = new AbortController();

  async function pump(controller: ReadableStreamDefaultController<Uint8Array>) {
    controller.enqueue(
      encodeFrame({
        kind: FrameKind.META,
        voice,
        locale: getVoiceLocale(voice),
        mimeType: AUDIO_MIME_TYPE,
        text,
        cues
      })
    );
    for (let iAttempt = 1; iAttempt <= MAX_SOCKET_ATTEMPTS; iAttempt++) {
      let isAudioSent = false;
      let heldWords: NarrationWord[] = [];
      const locateWord = createWordLocator({ text: sanitizeText(text) });

      function sendWord(word: NarrationWord) {
        controller.enqueue(
          encodeFrame({
            kind: FrameKind.WORD,
            ...word
          })
        );
      }

      function flushHeldWords() {
        for (const word of heldWords) {
          sendWord(word);
        }

        heldWords = [];
      }

      function onAudio(chunk: Uint8Array) {
        if (abort.signal.aborted) {
          return;
        }

        controller.enqueue(
          encodeFrame({
            kind: FrameKind.AUDIO,
            bytes: chunk
          })
        );
        isAudioSent = true;
        flushHeldWords();
      }

      function onWordBoundary(boundary: WordBoundary) {
        const textStart = locateWord(boundary.text);
        if (textStart === null || abort.signal.aborted) {
          return;
        }

        const word = {
          offsetSeconds: boundary.time,
          textStart,
          textLength: boundary.text.length
        };
        if (isAudioSent) {
          sendWord(word);
          return;
        }

        heldWords.push(word);
      }

      try {
        await edgeTts.synthesize({
          text,
          voice,
          signal: abort.signal,
          onAudio,
          onWordBoundary
        });
        flushHeldWords();
        controller.close();
        return;
      } catch (error) {
        if (abort.signal.aborted) {
          return;
        }

        const isRetryable = !isAudioSent && iAttempt < MAX_SOCKET_ATTEMPTS;
        if (!isRetryable) {
          log({
            severity: Severity.ERROR,
            message: `Narration failed after ${iAttempt} attempt(s): ${describeError(error)}`
          });
          controller.error(error);
          return;
        }

        await delay(RETRY_DELAY_MS, undefined, { signal: abort.signal });
      }
    }
  }

  return new ReadableStream<Uint8Array>({
    start: pump,
    cancel: () => abort.abort()
  });
}
