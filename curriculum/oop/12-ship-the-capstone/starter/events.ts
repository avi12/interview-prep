import type { EventBus } from "./types.ts";

export function createEventBus(_input: { reportError: (error: unknown) => void }): EventBus {
  throw new Error("not implemented");
}
