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
  const check = (key: string): Decision => {
    return { isAllowed: false, remaining: 0, retryAfterMs: 0 };
  };

  return { check };
};
