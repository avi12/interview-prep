import { LiveState, Sight } from "./live-state.ts";
import { z } from "./zod.ts";

const sessionSchema = z.object({
  vscodeTab: z.number(),
  glicTab: z.number(),
  glicWindow: z.number(),
  title: z.string(),
  brief: z.string(),
  briefing: z.string(),
  restarts: z.array(z.number()),
  isBooted: z.boolean(),
  isMicOpen: z.boolean(),
  state: z.enum(LiveState),
  detail: z.string(),
  sight: z.enum(Sight),
  frames: z.number()
});

export type Session = z.infer<typeof sessionSchema>;

export function parseSession(raw: unknown) {
  const parsed = sessionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
