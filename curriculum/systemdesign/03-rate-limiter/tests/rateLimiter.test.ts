import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import type { BucketStore, Decision } from "../starter/rateLimiter.ts";

type Module = {
  createInMemoryStore: () => BucketStore;
  createRateLimiter: (input: {
    capacity: number;
    refillPerSecond: number;
    store: BucketStore;
    now: () => number;
  }) => { check: (key: string) => Decision };
};

const { createInMemoryStore, createRateLimiter } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "rateLimiter.ts"
});

const SECOND_MS = 1000;
const HOUR_MS = 60 * 60 * SECOND_MS;

const createClock = (startMs = 0) => {
  let nowMs = startMs;
  return {
    now: () => nowMs,
    advance: (ms: number) => {
      nowMs += ms;
    },
    set: (ms: number) => {
      nowMs = ms;
    }
  };
};

const setup = ({ capacity, refillPerSecond }: { capacity: number; refillPerSecond: number }) => {
  const clock = createClock();
  const limiter = createRateLimiter({ capacity, refillPerSecond, store: createInMemoryStore(), now: clock.now });
  return { clock, limiter };
};

const countAllowed = ({ limiter, key, attempts }: { limiter: { check: (key: string) => Decision }; key: string; attempts: number }) =>
  Array.from({ length: attempts }, () => limiter.check(key)).filter(decision => decision.isAllowed).length;

describe("token bucket limiter", () => {
  it("allows a burst up to the capacity, then denies", () => {
    const { limiter } = setup({ capacity: 5, refillPerSecond: 1 });
    const decisions = Array.from({ length: 6 }, () => limiter.check("user-1"));
    expect(decisions.map(decision => decision.isAllowed)).toEqual([true, true, true, true, true, false]);
  });

  it("reports how many requests are left", () => {
    const { limiter } = setup({ capacity: 3, refillPerSecond: 1 });
    expect([1, 2, 3].map(() => limiter.check("user-1").remaining)).toEqual([2, 1, 0]);
  });

  it("refills with time, using the injected clock", () => {
    const { limiter, clock } = setup({ capacity: 2, refillPerSecond: 1 });
    countAllowed({ limiter, key: "user-1", attempts: 2 });
    expect(limiter.check("user-1").isAllowed).toBe(false);
    clock.advance(SECOND_MS);
    expect(limiter.check("user-1").isAllowed).toBe(true);
    expect(limiter.check("user-1").isAllowed).toBe(false);
  });

  it("never holds more than the capacity, however long the client was idle", () => {
    const { limiter, clock } = setup({ capacity: 5, refillPerSecond: 1 });
    limiter.check("user-1");
    clock.advance(HOUR_MS);
    expect(countAllowed({ limiter, key: "user-1", attempts: 20 })).toBe(5);
  });

  it("tells a denied client how long to wait", () => {
    const { limiter } = setup({ capacity: 2, refillPerSecond: 4 });
    countAllowed({ limiter, key: "user-1", attempts: 2 });
    expect(limiter.check("user-1")).toMatchObject({ isAllowed: false, remaining: 0, retryAfterMs: 250 });
  });

  it("handles a refill rate below one token per second", () => {
    const { limiter } = setup({ capacity: 1, refillPerSecond: 0.5 });
    limiter.check("user-1");
    expect(limiter.check("user-1").retryAfterMs).toBe(2000);
  });

  it("rounds the wait up, so retrying after it always succeeds", () => {
    const { limiter, clock } = setup({ capacity: 1, refillPerSecond: 3 });
    limiter.check("user-1");
    const denied = limiter.check("user-1");
    expect(denied.retryAfterMs).toBe(334);
    clock.advance(denied.retryAfterMs);
    expect(limiter.check("user-1").isAllowed).toBe(true);
  });

  it("reports remaining as whole tokens, even when the bucket holds a fraction", () => {
    const { limiter, clock } = setup({ capacity: 3, refillPerSecond: 1 });
    countAllowed({ limiter, key: "user-1", attempts: 3 });
    clock.advance(1.5 * SECOND_MS);
    expect(limiter.check("user-1")).toMatchObject({ isAllowed: true, remaining: 0 });
  });

  it("keeps partial tokens between denied requests", () => {
    const { limiter, clock } = setup({ capacity: 1, refillPerSecond: 2 });
    expect(limiter.check("user-1").isAllowed).toBe(true);
    clock.advance(250);
    expect(limiter.check("user-1")).toMatchObject({ isAllowed: false, retryAfterMs: 250 });
    clock.advance(250);
    expect(limiter.check("user-1").isAllowed).toBe(true);
  });

  it("gives every key its own bucket", () => {
    const { limiter } = setup({ capacity: 2, refillPerSecond: 1 });
    countAllowed({ limiter, key: "user-1", attempts: 2 });
    expect(limiter.check("user-1").isAllowed).toBe(false);
    expect(limiter.check("user-2").isAllowed).toBe(true);
  });

  it("does not hand out tokens when the clock jumps backwards", () => {
    const { limiter, clock } = setup({ capacity: 1, refillPerSecond: 1 });
    clock.set(10 * SECOND_MS);
    expect(limiter.check("user-1").isAllowed).toBe(true);
    clock.set(0);
    expect(limiter.check("user-1").isAllowed).toBe(false);
  });

  it("makes one atomic store update per check, so servers cannot race", () => {
    const inner = createInMemoryStore();
    let updateCount = 0;
    const store: BucketStore = {
      update: (key, change) => {
        updateCount++;
        return inner.update(key, change);
      }
    };
    const limiter = createRateLimiter({ capacity: 3, refillPerSecond: 1, store, now: createClock().now });
    limiter.check("user-1");
    limiter.check("user-1");
    expect(updateCount).toBe(2);
  });

  it("fails open: if the store is down, the request is allowed", () => {
    const brokenStore: BucketStore = {
      update: () => {
        throw new Error("redis is down");
      }
    };
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 1, store: brokenStore, now: createClock().now });
    expect(limiter.check("user-1")).toMatchObject({ isAllowed: true, retryAfterMs: 0 });
  });
});
