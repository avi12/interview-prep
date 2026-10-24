import { base64ToBytes } from "./base64.ts";
import { MIC_MIME_TYPE } from "./defaults.ts";
import { z } from "@/lib/zod.ts";

const RESPONSE_MODALITY_AUDIO = "AUDIO";
const MEDIA_RESOLUTION = "MEDIA_RESOLUTION_MEDIUM";
const USER_ROLE = "user";

export interface SetupOptions {
  model: string;
  voice: string;
  systemInstruction: string;
  resumeHandle: string | null;
}

export function buildSetupMessage({ model, voice, systemInstruction, resumeHandle }: SetupOptions) {
  return {
    setup: {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: [RESPONSE_MODALITY_AUDIO],
        mediaResolution: MEDIA_RESOLUTION,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice
            }
          }
        }
      },
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      contextWindowCompression: {
        slidingWindow: {}
      },
      sessionResumption: resumeHandle ? { handle: resumeHandle } : {}
    }
  };
}

export function audioMessage(base64: string) {
  return {
    realtimeInput: {
      audio: {
        mimeType: MIC_MIME_TYPE,
        data: base64
      }
    }
  };
}

export function audioEndMessage() {
  return {
    realtimeInput: {
      audioStreamEnd: true
    }
  };
}

export function videoMessage({ base64, mimeType }: {
  base64: string;
  mimeType: string;
}) {
  return {
    realtimeInput: {
      video: {
        mimeType,
        data: base64
      }
    }
  };
}

export function contextMessage(text: string) {
  return {
    clientContent: {
      turns: [{
        role: USER_ROLE,
        parts: [{ text }]
      }],
      turnComplete: false
    }
  };
}

const transcriptionSchema = z.object({ text: z.string().optional() }).optional();

const serverMessageSchema = z.object({
  setupComplete: z.object({}).optional(),
  serverContent: z.object({
    modelTurn: z.object({
      parts: z.array(
        z.object({
          inlineData: z.object({
            mimeType: z.string().optional(),
            data: z.string()
          }).optional()
        })
      ).optional()
    }).optional(),
    interrupted: z.boolean().optional(),
    turnComplete: z.boolean().optional(),
    inputTranscription: transcriptionSchema,
    outputTranscription: transcriptionSchema
  }).optional(),
  sessionResumptionUpdate: z.object({
    newHandle: z.string().optional(),
    resumable: z.boolean().optional()
  }).optional(),
  goAway: z.object({}).optional()
});
type ServerMessage = z.infer<typeof serverMessageSchema>;

export const ServerEventKind = {
  SETUP_COMPLETE: "setupComplete",
  AUDIO: "audio",
  INTERRUPTED: "interrupted",
  USER_TEXT: "userText",
  MODEL_TEXT: "modelText",
  TURN_COMPLETE: "turnComplete",
  RESUME_HANDLE: "resumeHandle",
  GO_AWAY: "goAway"
} as const;

export type ServerEvent =
  | { kind: typeof ServerEventKind.SETUP_COMPLETE }
  | { kind: typeof ServerEventKind.INTERRUPTED }
  | { kind: typeof ServerEventKind.TURN_COMPLETE }
  | { kind: typeof ServerEventKind.GO_AWAY }
  | {
    kind: typeof ServerEventKind.AUDIO;
    bytes: Uint8Array;
  }
  | {
    kind: typeof ServerEventKind.USER_TEXT | typeof ServerEventKind.MODEL_TEXT;
    text: string;
  }
  | {
    kind: typeof ServerEventKind.RESUME_HANDLE;
    handle: string;
  };

function contentEvents(content: NonNullable<ServerMessage["serverContent"]>) {
  const events: ServerEvent[] = [];
  if (content.interrupted) {
    events.push({ kind: ServerEventKind.INTERRUPTED });
  }

  for (const part of content.modelTurn?.parts ?? []) {
    if (part.inlineData) {
      events.push({
        kind: ServerEventKind.AUDIO,
        bytes: base64ToBytes(part.inlineData.data)
      });
    }
  }

  const heard = content.inputTranscription?.text;
  if (heard) {
    events.push({
      kind: ServerEventKind.USER_TEXT,
      text: heard
    });
  }

  const said = content.outputTranscription?.text;
  if (said) {
    events.push({
      kind: ServerEventKind.MODEL_TEXT,
      text: said
    });
  }

  if (content.turnComplete) {
    events.push({ kind: ServerEventKind.TURN_COMPLETE });
  }

  return events;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseServerMessage(text: string) {
  const parsed = serverMessageSchema.safeParse(parseJson(text));
  if (!parsed.success) {
    return [];
  }

  const message = parsed.data;
  const events: ServerEvent[] = [];
  if (message.setupComplete) {
    events.push({ kind: ServerEventKind.SETUP_COMPLETE });
  }

  if (message.serverContent) {
    events.push(...contentEvents(message.serverContent));
  }

  const resumption = message.sessionResumptionUpdate;
  if (resumption?.resumable && resumption.newHandle) {
    events.push({
      kind: ServerEventKind.RESUME_HANDLE,
      handle: resumption.newHandle
    });
  }

  if (message.goAway) {
    events.push({ kind: ServerEventKind.GO_AWAY });
  }

  return events;
}
