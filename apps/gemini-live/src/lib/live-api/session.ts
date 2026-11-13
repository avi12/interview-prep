import { bytesToBase64 } from "@/lib/base64.ts";
import type { Frame } from "@/lib/frame.ts";

import { LIVE_ENDPOINT, LIVE_MODEL, LIVE_VOICE } from "./defaults.ts";
import {
  audioEndMessage,
  audioMessage,
  buildSetupMessage,
  type ClientMessage,
  contextMessage,
  parseServerMessage,
  serializeClientMessage,
  type ServerEvent,
  ServerEventKind,
  videoMessage
} from "./messages.ts";
import { pcm16Bytes } from "./pcm.ts";

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

function sendOn({ socket, message }: { socket: WebSocket; message: ClientMessage }) {
  const text = serializeClientMessage(message);
  if (text) {
    socket.send(text);
  }
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
    const isResumingSocket = socket === resuming;
    if (isResumingSocket) {
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

  function handle({ socket, event }: { socket: WebSocket; event: ServerEvent }) {
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

  function onSocketClosed({
    socket,
    reason,
    hasBeenSetUp
  }: {
    socket: WebSocket;
    reason: string;
    hasBeenSetUp: boolean;
  }) {
    const isResumingSocket = socket === resuming;
    if (isResumingSocket) {
      finish({
        reason: `${RECONNECT_FAILED}: ${reason || SESSION_ENDED}`,
        isSetupRejected: !hasBeenSetUp
      });
      return;
    }

    const isSocketStale = socket !== active || resuming;
    if (isSocketStale) {
      return;
    }

    finish({
      reason: reason || SESSION_ENDED,
      isSetupRejected: !hasBeenSetUp
    });
  }

  function connect() {
    const socket = new WebSocket(socketUrl(apiKey));
    socket.binaryType = "arraybuffer";
    let hasBeenSetUp = false;
    socket.addEventListener("open", () => {
      sendOn({
        socket,
        message: buildSetupMessage({
          model,
          voice,
          systemInstruction,
          resumeHandle
        })
      });
    });
    socket.addEventListener("message", messageEvent => {
      for (const event of parseServerMessage(messageText(messageEvent.data))) {
        hasBeenSetUp ||= event.kind === ServerEventKind.SETUP_COMPLETE;
        handle({
          socket,
          event
        });
      }
    });
    socket.addEventListener("close", event => {
      onSocketClosed({
        socket,
        reason: event.reason,
        hasBeenSetUp
      });
    });
    return socket;
  }

  function send(message: ClientMessage) {
    if (!isReady) {
      return;
    }

    if (!active) {
      return;
    }

    const isActiveOpen = active.readyState === WebSocket.OPEN;
    if (!isActiveOpen) {
      return;
    }

    sendOn({
      socket: active,
      message
    });
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
