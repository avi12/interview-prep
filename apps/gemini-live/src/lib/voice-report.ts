import { LiveState } from "./live-state.ts";
import type { VoiceReport } from "./voice-channel.ts";
import { z } from "./zod.ts";

export const voiceReportSchema: z.ZodType<VoiceReport> = z.object({
  state: z.enum(LiveState),
  detail: z.string(),
  isMicOpen: z.boolean()
});
