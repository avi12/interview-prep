import type { CheckoutEvent, CheckoutListener, EventBus } from "./types.ts";

export const createEventBus = ({ reportError }: { reportError: (error: unknown) => void }): EventBus => {
  const listeners = new Set<CheckoutListener>();

  const deliver = ({ listener, event }: { listener: CheckoutListener; event: CheckoutEvent }) => {
    try {
      const result = listener(event);
      if (result instanceof Promise) result.catch(reportError);
    } catch (error) {
      reportError(error);
    }
  };

  return {
    subscribe: listener => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    publish: event => {
      for (const listener of [...listeners]) deliver({ listener, event });
    }
  };
};
