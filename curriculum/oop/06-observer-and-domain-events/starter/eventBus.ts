import type { DomainEvent, Listener } from "./events.ts";

export type ListenerFailure = {
  event: DomainEvent;
  listener: Listener;
  error: unknown;
};

export class EventBus {
  constructor(_options: { onListenerError: (failure: ListenerFailure) => void }) {}

  subscribe<TEvent extends DomainEvent>(_type: string, _listener: Listener<TEvent>): () => void {
    throw new Error("not implemented");
  }

  async publish(_event: DomainEvent): Promise<void> {
    throw new Error("not implemented");
  }
}
