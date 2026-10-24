import { MIC_MIME_TYPE } from "./defaults.ts";
import { base64ToBytes } from "@/lib/base64.ts";
import { z } from "@/lib/zod.ts";

const RESPONSE_MODALITY_AUDIO = "AUDIO";
const MEDIA_RESOLUTION = "MEDIA_RESOLUTION_MEDIUM";
const USER_ROLE = "user";
const MODEL_PREFIX = "models/";

const textPartSchema = z.object({ text: z.string() });
const blobSchema = z.object({
  mimeType: z.string(),
  data: z.string()
});
const emptySchema = z.object({});

const setupMessageSchema = z.object({
  setup: z.object({
    model: z.string().startsWith(MODEL_PREFIX),
    generationConfig: z.object({
      responseModalities: z.array(z.literal(RESPONSE_MODALITY_AUDIO)),
      mediaResolution: z.literal(MEDIA_RESOLUTION),
      speechConfig: z.object({
        voiceConfig: z.object({
          prebuiltVoiceConfig: z.object({ voiceName: z.string().min(1) })
        })
      })
    }),
    systemInstruction: z.object({ parts: z.array(textPartSchema) }),
    inputAudioTranscription: emptySchema,
    outputAudioTranscription: emptySchema,
    contextWindowCompression: z.object({ slidingWindow: emptySchema }),
    sessionResumption: z.object({ handle: z.string().optional() })
  })
});
type SetupMessage = z.infer<typeof setupMessageSchema>;

const audioMessageSchema = z.object({ realtimeInput: z.object({ audio: blobSchema }) });
const videoMessageSchema = z.object({ realtimeInput: z.object({ video: blobSchema }) });
const audioEndMessageSchema = z.object({ realtimeInput: z.object({ audioStreamEnd: z.literal(true) }) });

const clientContentMessageSchema = z.object({
  clientContent: z.object({
    turns: z.array(
      z.object({
        role: z.literal(USER_ROLE),
        parts: z.array(textPartSchema)
      })
    ),
    turnComplete: z.boolean()
  })
});
type ClientContentMessage = z.infer<typeof clientContentMessageSchema>;

const clientMessageSchema = z.union([
  setupMessageSchema,
  audioMessageSchema,
  videoMessageSchema,
  audioEndMessageSchema,
  clientContentMessageSchema
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

export function serializeClientMessage(message: ClientMessage) {
  const parsed = clientMessageSchema.safeParse(message);
  return parsed.success ? JSON.stringify(parsed.data) : null;
}

export interface SetupOptions {
  model: string;
  voice: string;
  systemInstruction: string;
  resumeHandle: string | null;
}

export function buildSetupMessage({ model, voice, systemInstruction, resumeHandle }: SetupOptions): SetupMessage {
  return {
    setup: {
      model: `${MODEL_PREFIX}${model}`,
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

export function audioMessage(base64: string): z.infer<typeof audioMessageSchema> {
  return {
    realtimeInput: {
      audio: {
        mimeType: MIC_MIME_TYPE,
        data: base64
      }
    }
  };
}

export function audioEndMessage(): z.infer<typeof audioEndMessageSchema> {
  return {
    realtimeInput: {
      audioStreamEnd: true
    }
  };
}

export function videoMessage({ base64, mimeType }: {
  base64: string;
  mimeType: string;
}): z.infer<typeof videoMessageSchema> {
  return {
    realtimeInput: {
      video: {
        mimeType,
        data: base64
      }
    }
  };
}

export function contextMessage(text: string): ClientContentMessage {
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
