import { Engine, engineSchema } from "./engine.ts";
import { LiveState, Sight } from "./live-state.ts";
import { z } from "./zod.ts";

const sharedFields = {
  vscodeTab: z.number(),
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
};

const sessionSchema = z.object({
  ...sharedFields,
  engine: engineSchema,
  liveTab: z.number(),
  liveWindow: z.number()
});

const sessionBeforeEnginesSchema = z.object({
  ...sharedFields,
  glicTab: z.number(),
  glicWindow: z.number()
}).transform(({ glicTab, glicWindow, ...shared }) => ({
  ...shared,
  engine: Engine.SUBSCRIPTION,
  liveTab: glicTab,
  liveWindow: glicWindow
}));

const storedSessionSchema = z.union([sessionSchema, sessionBeforeEnginesSchema]);

export type Session = z.infer<typeof sessionSchema>;

export function parseSession(raw: unknown): Session | null {
  const parsed = storedSessionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function freshSession({ engine, vscodeTab, title, liveTab, liveWindow, brief }: {
  engine: Engine;
  vscodeTab: number;
  title: string;
  liveTab: number;
  liveWindow: number;
  brief: string;
}): Session {
  return {
    engine,
    vscodeTab,
    liveTab,
    liveWindow,
    title,
    brief,
    briefing: brief,
    restarts: [],
    isBooted: false,
    isMicOpen: false,
    state: LiveState.OPENING,
    detail: "",
    sight: Sight.UNKNOWN,
    frames: 0
  };
}

export function isEngineTab({ session, engine, tabId }: {
  session: Session | null;
  engine: Engine;
  tabId: number | undefined;
}) {
  return !!session && tabId !== undefined && session.engine === engine && session.liveTab === tabId;
}
