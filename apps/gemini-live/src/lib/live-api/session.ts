import { bytesToBase64 } from "./base64.ts";
import { LIVE_ENDPOINT, LIVE_MODEL, LIVE_VOICE } from "./defaults.ts";
import {
  audioEndMessage,
  audioMessage,
  buildSetupMessage,
  contextMessage,
  parseServerMessage,
  type ServerEvent,
  ServerEventKind,
  videoMessage
} from "./messages.ts";
import { pcm16Bytes } from "./pcm.ts";
import type { Frame } from "@/lib/bridge-vocab.ts";

const SESSION_ENDED = "The session ended";
const RECONNECT_FAILED = "Reconnect failed";
const CLOSE_NORMAL = 1000;
const CLOSE_REASON_STOPPED = "bye";

export const LiveConnection = {
  CONNECTING: "connecting",
  READY: "ready",
  RECONNECTING: "reconnecting"
} as const;
export type LiveConnection = (typeof LiveConnection)[keyof typeof LiveConnection];

export interface LiveClosure {
  reason: string;
  isSetupRejected: boolean;
}

export interface LiveSessionEvents {
  onConnection(connection: LiveConnection): void;
  onAudio(bytes: Uint8Array): void;
  onInterrupted(): void;
  onUserText(text: string): void;
  onModelText(text: string): void;
  onTurnComplete(): void;
  onClosed(closure: LiveClosure): void;
}

export interface LiveSessionOptions {
  apiKey: string;
  systemInstruction: string;
  events: LiveSessionEvents;
  model?: string;
  voice?: string;
}

const textDecoder = new TextDecoder();

function messageText(data: unknown) {
  if (typeof data === "string") {
    return data;
  }

  return data instanceof ArrayBuffer ? textDecoder.decode(data) : "";
}

function socketUrl(apiKey: string) {
  return `${LIVE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
}

export function openLiveSession(options: LiveSessionOptions) {
  const { apiKey, systemInstruction, events, model = LIVE_MODEL, voice = LIVE_VOICE } = options;
  let active: WebSocket | null = null;
  let resuming: WebSocket | null = null;
  let resumeHandle: string | null = null;
  let isReady = false;
  let isStopped = false;

  function closeSockets() {
    for (const socket of [active, resuming]) {
      socket?.close(CLOSE_NORMAL, CLOSE_REASON_STOPPED);
    }
    active = null;
    resuming = null;
  }

  function finish(closure: LiveClosure) {
    if (isStopped) {
      return;
    }

    isStopped = true;
    isReady = false;
    closeSockets();
    events.onClosed(closure);
  }

  function promote(socket: WebSocket) {
    if (socket === resuming) {
      active?.close(CLOSE_NORMAL, CLOSE_REASON_STOPPED);
      active = socket;
      resuming = null;
    }

    isReady = true;
    events.onConnection(LiveConnection.READY);
  }

  function resume() {
    if (resuming) {
      return;
    }

    events.onConnection(LiveConnection.RECONNECTING);
    resuming = connect();
  }

  function handle({ socket, event }: {
    socket: WebSocket;
    event: ServerEvent;
  }) {
    switch (event.kind) {
      case ServerEventKind.SETUP_COMPLETE:
        promote(socket);
        return;
      case ServerEventKind.AUDIO:
        events.onAudio(event.bytes);
        return;
      case ServerEventKind.INTERRUPTED:
        events.onInterrupted();
        return;
      case ServerEventKind.USER_TEXT:
        events.onUserText(event.text);
        return;
      case ServerEventKind.MODEL_TEXT:
        events.onModelText(event.text);
        return;
      case ServerEventKind.TURN_COMPLETE:
        events.onTurnComplete();
        return;
      case ServerEventKind.RESUME_HANDLE:
        resumeHandle = event.handle;
        return;
      case ServerEventKind.GO_AWAY:
        resume();
    }
  }

  function onSocketClosed({ socket, reason, wasSetUp }: {
    socket: WebSocket;
    reason: string;
    wasSetUp: boolean;
  }) {
    if (socket === resuming) {
      finish({
        reason: `${RECONNECT_FAILED}: ${reason || SESSION_ENDED}`,
        isSetupRejected: !wasSetUp
      });
      return;
    }

    if (socket !== active || resuming) {
      return;
    }

    finish({
      reason: reason || SESSION_ENDED,
      isSetupRejected: !wasSetUp
    });
  }

  function connect() {
    const socket = new WebSocket(socketUrl(apiKey));
    socket.binaryType = "arraybuffer";
    let wasSetUp = false;
    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify(
          buildSetupMessage({
            model,
            voice,
            systemInstruction,
            resumeHandle
          })
        )
      );
    });
    socket.addEventListener("message", e => {
      for (const event of parseServerMessage(messageText(e.data))) {
        wasSetUp ||= event.kind === ServerEventKind.SETUP_COMPLETE;
        handle({
          socket,
          event
        });
      }
    });
    socket.addEventListener("close", e => {
      onSocketClosed({
        socket,
        reason: e.reason,
        wasSetUp
      });
    });
    return socket;
  }

  function send(message: object) {
    if (!isReady || active?.readyState !== WebSocket.OPEN) {
      return;
    }

    active.send(JSON.stringify(message));
  }

  events.onConnection(LiveConnection.CONNECTING);
  active = connect();

  return {
    sendAudio(pcm: Int16Array) {
      send(audioMessage(bytesToBase64(pcm16Bytes(pcm))));
    },
    endAudio() {
      send(audioEndMessage());
    },
    sendFrame(frame: Frame) {
      send(videoMessage(frame));
    },
    sendContext(text: string) {
      send(contextMessage(text));
    },
    close() {
      isStopped = true;
      isReady = false;
      closeSockets();
    }
  };
}

export type LiveSession = ReturnType<typeof openLiveSession>;
