import type { DomainEvent, Listener } from "./events.ts";

export type ListenerFailure = { event: DomainEvent; listener: Listener; error: unknown };

type Subscription = { listener: Listener };

export class EventBus {
  readonly #subscriptionsByType = new Map<string, Subscription[]>();
  readonly #onListenerError: (failure: ListenerFailure) => void;

  constructor({ onListenerError }: { onListenerError: (failure: ListenerFailure) => void }) {
    this.#onListenerError = onListenerError;
  }

  subscribe<TEvent extends DomainEvent>(type: string, listener: Listener<TEvent>) {
    const subscription = { listener };
    this.#subscriptionsByType.set(type, [...(this.#subscriptionsByType.get(type) ?? []), subscription]);
    return () => {
      const remaining = (this.#subscriptionsByType.get(type) ?? []).filter(candidate => candidate !== subscription);
      this.#subscriptionsByType.set(type, remaining);
    };
  }

  async publish(event: DomainEvent) {
    const subscriptions = this.#subscriptionsByType.get(event.type) ?? [];
    for (const { listener } of subscriptions) {
      try {
        await listener.handle(event);
      } catch (error) {
        this.#onListenerError({ event, listener, error });
      }
    }
  }
}
