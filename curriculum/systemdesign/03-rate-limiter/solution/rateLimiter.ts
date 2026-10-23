export type BucketState = { tokens: number; refilledAtMs: number };

export type Decision = { isAllowed: boolean; remaining: number; retryAfterMs: number };

export type Change = (previous: BucketState | undefined) => { state: BucketState; decision: Decision };

export type BucketStore = { update: (key: string, change: Change) => Decision };

const MS_PER_SECOND = 1000;
const COST_PER_REQUEST = 1;

export const createInMemoryStore = (): BucketStore => {
  const states = new Map<string, BucketState>();
  return {
    update: (key, change) => {
      const { state, decision } = change(states.get(key));
      states.set(key, state);
      return decision;
    }
  };
};

export const createRateLimiter = ({
  capacity,
  refillPerSecond,
  store,
  now
}: {
  capacity: number;
  refillPerSecond: number;
  store: BucketStore;
  now: () => number;
}) => {
  const failOpenDecision: Decision = { isAllowed: true, remaining: capacity, retryAfterMs: 0 };

  const refill = ({ previous, nowMs }: { previous: BucketState | undefined; nowMs: number }): BucketState => {
    if (!previous) return { tokens: capacity, refilledAtMs: nowMs };
    if (nowMs <= previous.refilledAtMs) return previous;
    const elapsedSeconds = (nowMs - previous.refilledAtMs) / MS_PER_SECOND;
    const tokens = Math.min(capacity, previous.tokens + elapsedSeconds * refillPerSecond);
    return { tokens, refilledAtMs: nowMs };
  };

  const takeToken = (previous: BucketState | undefined) => {
    const refilled = refill({ previous, nowMs: now() });
    if (refilled.tokens < COST_PER_REQUEST) {
      const missingTokens = COST_PER_REQUEST - refilled.tokens;
      const retryAfterMs = Math.ceil((missingTokens / refillPerSecond) * MS_PER_SECOND);
      return { state: refilled, decision: { isAllowed: false, remaining: 0, retryAfterMs } };
    }
    const state = { ...refilled, tokens: refilled.tokens - COST_PER_REQUEST };
    return { state, decision: { isAllowed: true, remaining: Math.floor(state.tokens), retryAfterMs: 0 } };
  };

  const check = (key: string): Decision => {
    try {
      return store.update(key, takeToken);
    } catch {
      return failOpenDecision;
    }
  };

  return { check };
};
