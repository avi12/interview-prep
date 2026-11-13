import { openEdgeSocket } from "@server/edge-tts/socket.ts";

import { SEC_MS_GEC_VERSION, SYNTHESIZE_URL, TRUSTED_CLIENT_TOKEN } from "#scripts/lib/edge-tts/constants.ts";
import { secMsGec } from "#scripts/lib/edge-tts/gec.ts";
import {
  configMessage,
  createId,
  FramePath,
  parseBinaryFrame,
  parseTextFrame,
  parseWordBoundaries,
  ssmlMessage,
  type WordBoundary
} from "#scripts/lib/edge-tts/protocol.ts";
import { buildSsml } from "#scripts/lib/edge-tts/ssml.ts";

const QueryParameter = {
  SUBSCRIPTION_KEY: "Ocp-Apim-Subscription-Key",
  SEC_MS_GEC: "Sec-MS-GEC",
  SEC_MS_GEC_VERSION: "Sec-MS-GEC-Version",
  CONNECTION_ID: "ConnectionId"
} as const;

const SOCKET_BINARY_TYPE = "arraybuffer";
const NORMAL_CLOSURE_CODE = 1000;
const ABORT_EVENT = "abort";

export interface SynthesizeOptions {
  text: string;
  voice: string;
  signal: AbortSignal;
  onAudio: (chunk: Uint8Array) => void;
  onWordBoundary: (boundary: WordBoundary) => void;
}

async function createSynthesizeUrl() {
  const parameters = new URLSearchParams({
    [QueryParameter.SUBSCRIPTION_KEY]: TRUSTED_CLIENT_TOKEN,
    [QueryParameter.SEC_MS_GEC]: await secMsGec(),
    [QueryParameter.SEC_MS_GEC_VERSION]: SEC_MS_GEC_VERSION,
    [QueryParameter.CONNECTION_ID]: createId()
  });
  return `${SYNTHESIZE_URL}?${parameters}`;
}

export async function synthesize({ text, voice, signal, onAudio, onWordBoundary }: SynthesizeOptions) {
  signal.throwIfAborted();
  const socket = openEdgeSocket(await createSynthesizeUrl());
  socket.binaryType = SOCKET_BINARY_TYPE;

  return new Promise<void>((resolve, reject) => {
    let isFinished = false;

    function finish(error?: unknown) {
      if (isFinished) {
        return;
      }

      isFinished = true;
      signal.removeEventListener(ABORT_EVENT, onAbort);
      const isOpenOrConnecting = socket.readyState <= WebSocket.OPEN;
      if (isOpenOrConnecting) {
        socket.close(NORMAL_CLOSURE_CODE);
      }

      if (error === undefined) {
        resolve();
        return;
      }

      reject(error);
    }

    function onAbort() {
      finish(signal.reason);
    }

    function handleTextFrame(data: string) {
      const frame = parseTextFrame(data);
      if (frame.path === FramePath.TURN_END) {
        finish();
        return;
      }

      if (frame.path !== FramePath.AUDIO_METADATA) {
        return;
      }

      for (const boundary of parseWordBoundaries(frame.body)) {
        onWordBoundary(boundary);
      }
    }

    function handleBinaryFrame(data: ArrayBuffer) {
      const frame = parseBinaryFrame(data);
      const hasAudio = frame.path === FramePath.AUDIO && frame.audio.byteLength > 0;
      if (hasAudio) {
        onAudio(frame.audio);
      }
    }

    signal.addEventListener(ABORT_EVENT, onAbort);

    socket.onopen = () => {
      socket.send(configMessage());
      socket.send(
        ssmlMessage({
          requestId: createId(),
          ssml: buildSsml({
            text,
            voice
          })
        })
      );
    };
    socket.onmessage = event => {
      if (typeof event.data === "string") {
        handleTextFrame(event.data);
        return;
      }

      handleBinaryFrame(event.data);
    };
    socket.onerror = () => finish(new Error("The Read Aloud service refused the connection"));
    socket.onclose = event => finish(new Error(`Connection dropped before the audio finished (${event.code})`));
  });
}

export type Synthesize = typeof synthesize;
