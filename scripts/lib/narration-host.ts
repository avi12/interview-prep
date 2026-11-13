import { zod } from "#scripts/lib/zod.ts";

export const NarrationAction = {
  VOICES: "narrationVoices",
  VOICE: "narrationVoice",
  SET_VOICE: "narrationSetVoice",
  RECORD: "narrationRecord"
} as const;

export const voiceSchema = zod.object({
  ShortName: zod.string(),
  FriendlyName: zod.string(),
  Locale: zod.string(),
  LocaleName: zod.string(),
  Gender: zod.string()
});

export const recordingSchema = zod.object({
  audio: zod.string().startsWith("data:"),
  duration: zod.number(),
  words: zod.array(zod.tuple([zod.number(), zod.number(), zod.number()]))
});

const requestIdSchema = zod.number().int();

export const narrationRequestSchema = zod.union([
  zod.object({
    action: zod.enum([NarrationAction.VOICES, NarrationAction.VOICE]),
    request: requestIdSchema
  }),
  zod.object({
    action: zod.literal(NarrationAction.SET_VOICE),
    request: requestIdSchema,
    voice: zod.string().min(1)
  }),
  zod.object({
    action: zod.literal(NarrationAction.RECORD),
    request: requestIdSchema,
    text: zod.string().min(1),
    voice: zod.string().min(1)
  })
]);
export type NarrationRequest = zod.infer<typeof narrationRequestSchema>;

export type NarrationReply =
  | {
      narrationReply: number;
      value: unknown;
    }
  | {
      narrationReply: number;
      error: string;
    };

export const NARRATION_HOST_SCRIPT = `
if (typeof host !== "undefined" && host) {
  let lastRequest = 0;
  const waiting = new Map();
  addEventListener("message", e => {
    const reply = e.data;
    const pending = waiting.get(reply?.narrationReply);
    if (!pending) return;
    waiting.delete(reply.narrationReply);
    if ("error" in reply) pending.reject(new Error(reply.error));
    else pending.resolve(reply.value);
  });
  const ask = (action, fields) => new Promise((resolve, reject) => {
    lastRequest += 1;
    waiting.set(lastRequest, { resolve, reject });
    host.postMessage({ action, request: lastRequest, ...fields });
  });
  globalThis.narrationHost = {
    listVoices: () => ask(${JSON.stringify(NarrationAction.VOICES)}, {}),
    getVoice: () => ask(${JSON.stringify(NarrationAction.VOICE)}, {}),
    setVoice: voice => ask(${JSON.stringify(NarrationAction.SET_VOICE)}, { voice }),
    record: ({ text, voice }) => ask(${JSON.stringify(NarrationAction.RECORD)}, { text, voice })
  };
}`;
