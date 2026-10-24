import { languageSchema } from "./language.ts";
import { LiveState } from "./live-state.ts";
import { z } from "./zod.ts";

export const voiceHelloSchema = z.object({
  language: languageSchema,
  isAutostart: z.boolean()
});
export type VoiceHello = z.infer<typeof voiceHelloSchema>;

export const voiceReportSchema = z.object({
  state: z.enum(LiveState),
  detail: z.string(),
  isMicOpen: z.boolean()
});
export type VoiceReport = z.infer<typeof voiceReportSchema>;
