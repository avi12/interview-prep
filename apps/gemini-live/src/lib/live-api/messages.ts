import { base64ToBytes } from "@/lib/base64.ts";
import { zod } from "@/lib/zod.ts";

import { MIC_MIME_TYPE } from "./defaults.ts";

const RESPONSE_MODALITY_AUDIO = "AUDIO";
const MEDIA_RESOLUTION = "MEDIA_RESOLUTION_MEDIUM";
const USER_ROLE = "user";
const MODEL_PREFIX = "models/";

const textPartSchema = zod.object({ text: zod.string() });
const blobSchema = zod.object({
  mimeType: zod.string(),
  data: zod.string()
});
const emptySchema = zod.object({});

const setupMessageSchema = zod.object({
  setup: zod.object({
    model: zod.string().startsWith(MODEL_PREFIX),
    generationConfig: zod.object({
      responseModalities: zod.array(zod.literal(RESPONSE_MODALITY_AUDIO)),
      mediaResolution: zod.literal(MEDIA_RESOLUTION),
      speechConfig: zod.object({
        voiceConfig: zod.object({
          prebuiltVoiceConfig: zod.object({ voiceName: zod.string().min(1) })
        })
      })
    }),
    systemInstruction: zod.object({ parts: zod.array(textPartSchema) }),
    inputAudioTranscription: emptySchema,
    outputAudioTranscription: emptySchema,
    contextWindowCompression: zod.object({ slidingWindow: emptySchema }),
    sessionResumption: zod.object({ handle: zod.string().optional() })
  })
});
type SetupMessage = zod.infer<typeof setupMessageSchema>;

const audioMessageSchema = zod.object({ realtimeInput: zod.object({ audio: blobSchema }) });
const videoMessageSchema = zod.object({ realtimeInput: zod.object({ video: blobSchema }) });
const audioEndMessageSchema = zod.object({ realtimeInput: zod.object({ audioStreamEnd: zod.literal(true) }) });

const clientContentMessageSchema = zod.object({
  clientContent: zod.object({
    turns: zod.array(
      zod.object({
        role: zod.literal(USER_ROLE),
        parts: zod.array(textPartSchema)
      })
    ),
    turnComplete: zod.boolean()
  })
});
type ClientContentMessage = zod.infer<typeof clientContentMessageSchema>;

const clientMessageSchema = zod.union([
  setupMessageSchema,
  audioMessageSchema,
  videoMessageSchema,
  audioEndMessageSchema,
  clientContentMessageSchema
]);
export type ClientMessage = zod.infer<typeof clientMessageSchema>;

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

export function buildSetupMessage({ model, voice, systemInstruction, resumeHandle }: SetupOptions) {
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
  } satisfies SetupMessage;
}

export function audioMessage(base64: string) {
  return {
    realtimeInput: {
      audio: {
        mimeType: MIC_MIME_TYPE,
        data: base64
      }
    }
  } satisfies zod.infer<typeof audioMessageSchema>;
}

export function audioEndMessage() {
  return {
    realtimeInput: {
      audioStreamEnd: true
    }
  } satisfies zod.infer<typeof audioEndMessageSchema>;
}

export function videoMessage({ base64, mimeType }: { base64: string; mimeType: string }) {
  return {
    realtimeInput: {
      video: {
        mimeType,
        data: base64
      }
    }
  } satisfies zod.infer<typeof videoMessageSchema>;
}

export function contextMessage(text: string) {
  return {
    clientContent: {
      turns: [
        {
          role: USER_ROLE,
          parts: [{ text }]
        }
      ],
      turnComplete: false
    }
  } satisfies ClientContentMessage;
}

const transcriptionSchema = zod.object({ text: zod.string().optional() }).optional();

const serverMessageSchema = zod.object({
  setupComplete: zod.object({}).optional(),
  serverContent: zod
    .object({
      modelTurn: zod
        .object({
          parts: zod
            .array(
              zod.object({
                inlineData: zod
                  .object({
                    mimeType: zod.string().optional(),
                    data: zod.string()
                  })
                  .optional()
              })
            )
            .optional()
        })
        .optional(),
      interrupted: zod.boolean().optional(),
      turnComplete: zod.boolean().optional(),
      inputTranscription: transcriptionSchema,
      outputTranscription: transcriptionSchema
    })
    .optional(),
  sessionResumptionUpdate: zod
    .object({
      newHandle: zod.string().optional(),
      resumable: zod.boolean().optional()
    })
    .optional(),
  goAway: zod.object({}).optional()
});
type ServerMessage = zod.infer<typeof serverMessageSchema>;

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

function parseJson(text: string) {
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
  const handle = resumption?.resumable ? resumption.newHandle : undefined;
  if (handle) {
    events.push({
      kind: ServerEventKind.RESUME_HANDLE,
      handle
    });
  }

  if (message.goAway) {
    events.push({ kind: ServerEventKind.GO_AWAY });
  }

  return events;
}
