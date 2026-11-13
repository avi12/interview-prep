import { languageSchema } from "./language.ts";
import { LiveState } from "./live-state.ts";
import { zod } from "./zod.ts";

export const voiceHelloSchema = zod.object({
  language: languageSchema,
  isAutostart: zod.boolean()
});
export type VoiceHello = zod.infer<typeof voiceHelloSchema>;

export const voiceReportSchema = zod.object({
  state: zod.enum(LiveState),
  detail: zod.string(),
  isMicOpen: zod.boolean()
});
export type VoiceReport = zod.infer<typeof voiceReportSchema>;
