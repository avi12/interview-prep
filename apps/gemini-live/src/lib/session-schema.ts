import { Engine, engineSchema } from "./engine.ts";
import { LiveState, Sight } from "./live-state.ts";
import { zod } from "./zod.ts";

const sharedFields = {
  vscodeTab: zod.number(),
  title: zod.string(),
  brief: zod.string(),
  briefing: zod.string(),
  restarts: zod.array(zod.number()),
  isBooted: zod.boolean(),
  isMicOpen: zod.boolean(),
  state: zod.enum(LiveState),
  detail: zod.string(),
  sight: zod.enum(Sight),
  frames: zod.number()
};

const sessionSchema = zod.object({
  ...sharedFields,
  engine: engineSchema,
  liveTab: zod.number(),
  liveWindow: zod.number()
});

const sessionBeforeEnginesSchema = zod
  .object({
    ...sharedFields,
    glicTab: zod.number(),
    glicWindow: zod.number()
  })
  .transform(({ glicTab, glicWindow, ...shared }) => ({
    ...shared,
    engine: Engine.SUBSCRIPTION,
    liveTab: glicTab,
    liveWindow: glicWindow
  }));

const storedSessionSchema = zod.union([sessionSchema, sessionBeforeEnginesSchema]);

export type Session = zod.infer<typeof sessionSchema>;

export function parseSession(raw: unknown) {
  const parsed = storedSessionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function freshSession({
  engine,
  vscodeTab,
  title,
  liveTab,
  liveWindow,
  brief
}: {
  engine: Engine;
  vscodeTab: number;
  title: string;
  liveTab: number;
  liveWindow: number;
  brief: string;
}) {
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
    isMicOpen: true,
    state: LiveState.OPENING,
    detail: "",
    sight: Sight.UNKNOWN,
    frames: 0
  };
}

export function isEngineTab({
  session,
  engine,
  tabId
}: {
  session: Session | null;
  engine: Engine;
  tabId: number | undefined;
}) {
  return !!session && tabId !== undefined && session.engine === engine && session.liveTab === tabId;
}
