import { storage } from "#imports";
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
  state: z.enum(LiveState),
  detail: z.string(),
  sight: z.enum(Sight)
});

export type Session = z.infer<typeof sessionSchema>;

export const sessionItem = storage.defineItem<unknown>("local:session", { fallback: null });

export const parseSession = (raw: unknown) => {
  const parsed = sessionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

export const loadSession = async () => parseSession(await sessionItem.getValue());

let writes: Promise<unknown> = Promise.resolve();

const enqueue = <T>(task: () => Promise<T>) => {
  const run = writes.then(task);
  writes = run.catch(() => {});
  return run;
};

export const saveSession = (session: Session) => enqueue(() => sessionItem.setValue(session));

export const clearSession = () => enqueue(() => sessionItem.removeValue());

export const updateSession = (patch: Partial<Session>) =>
  enqueue(async () => {
    const session = await loadSession();
    if (!session) return null;
    const next = { ...session, ...patch };
    await sessionItem.setValue(next);
    return next;
  });
