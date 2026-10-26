import { z } from "#scripts/lib/zod.ts";

export const NarrationAction = {
  voices: "narrationVoices",
  voice: "narrationVoice",
  setVoice: "narrationSetVoice",
  record: "narrationRecord"
} as const;

export const voiceSchema = z.object({
  ShortName: z.string(),
  FriendlyName: z.string(),
  Locale: z.string(),
  LocaleName: z.string(),
  Gender: z.string()
});

export const recordingSchema = z.object({
  audio: z.string().startsWith("data:"),
  duration: z.number(),
  words: z.array(z.tuple([z.number(), z.number(), z.number()]))
});

const requestIdSchema = z.number().int();

export const narrationRequestSchema = z.union([
  z.object({
    action: z.enum([NarrationAction.voices, NarrationAction.voice]),
    request: requestIdSchema
  }),
  z.object({
    action: z.literal(NarrationAction.setVoice),
    request: requestIdSchema,
    voice: z.string().min(1)
  }),
  z.object({
    action: z.literal(NarrationAction.record),
    request: requestIdSchema,
    text: z.string().min(1),
    voice: z.string().min(1)
  })
]);
export type NarrationRequest = z.infer<typeof narrationRequestSchema>;

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
    listVoices: () => ask(${JSON.stringify(NarrationAction.voices)}, {}),
    getVoice: () => ask(${JSON.stringify(NarrationAction.voice)}, {}),
    setVoice: voice => ask(${JSON.stringify(NarrationAction.setVoice)}, { voice }),
    record: ({ text, voice }) => ask(${JSON.stringify(NarrationAction.record)}, { text, voice })
  };
}`;
