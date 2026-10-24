import type { Engine } from "./engine.ts";
import { isEngineTab, parseSession, type Session } from "./session-schema.ts";
import { storage } from "#imports";

export const sessionItem = storage.defineItem<unknown>("local:session", { fallback: null });

export async function loadSession() {
  return parseSession(await sessionItem.getValue());
}

export async function loadEngineSession({ engine, tab }: {
  engine: Engine;
  tab: { id?: number } | undefined;
}) {
  const session = await loadSession();
  return isEngineTab({
    session,
    engine,
    tabId: tab?.id
  }) ? session : null;
}

let writes: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>) {
  const run = writes.then(task);
  writes = run.catch(() => {});
  return run;
}

export function saveSession(session: Session) {
  return enqueue(() => sessionItem.setValue(session));
}

export function clearSession() {
  return enqueue(() => sessionItem.removeValue());
}

export function updateSession(patch: Partial<Session>) {
  return enqueue(async () => {
    const session = await loadSession();
    if (!session) {
      return null;
    }

    const next = {
      ...session,
      ...patch
    };
    await sessionItem.setValue(next);
    return next;
  });
}
