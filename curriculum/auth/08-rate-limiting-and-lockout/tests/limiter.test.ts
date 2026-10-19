import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Result = { isAllowed: boolean; retryAfterSeconds: number };
type Module = {
  createTokenBucketLimiter: (input: { capacity: number; refillPerSecond: number; now: () => number }) => {
    tryConsume: (key: string) => Result;
  };
};

const { createTokenBucketLimiter } = await loadImpl<Module>({ testUrl: import.meta.url, file: "limiter.ts" });

const START_MS = 1_900_000_000_000;
const ONE_SECOND = 1000;
const ONE_HOUR = 3_600_000;

const makeLimiter = ({ capacity, refillPerSecond }: { capacity: number; refillPerSecond: number }) => {
  let currentMs = START_MS;
  const limiter = createTokenBucketLimiter({ capacity, refillPerSecond, now: () => currentMs });
  const advance = (ms: number) => {
    currentMs += ms;
  };
  const attempt = (key = "alice") => limiter.tryConsume(key);
  return { attempt, advance };
};

describe("token bucket limiter", () => {
  it("allows a burst up to the capacity, then blocks", () => {
    const { attempt } = makeLimiter({ capacity: 3, refillPerSecond: 1 });
    expect([attempt().isAllowed, attempt().isAllowed, attempt().isAllowed]).toEqual([true, true, true]);
    expect(attempt().isAllowed).toBe(false);
  });

  it("tells a blocked caller how many whole seconds to wait", () => {
    const { attempt, advance } = makeLimiter({ capacity: 1, refillPerSecond: 1 });
    expect(attempt()).toEqual({ isAllowed: true, retryAfterSeconds: 0 });
    expect(attempt()).toEqual({ isAllowed: false, retryAfterSeconds: 1 });
    advance(250);
    expect(attempt()).toEqual({ isAllowed: false, retryAfterSeconds: 1 });
  });

  it("rounds the wait up for a slow refill", () => {
    const { attempt, advance } = makeLimiter({ capacity: 1, refillPerSecond: 0.5 });
    attempt();
    advance(500);
    expect(attempt().retryAfterSeconds).toBe(2);
    advance(1000);
    expect(attempt().retryAfterSeconds).toBe(1);
  });

  it("gives tokens back as time passes", () => {
    const { attempt, advance } = makeLimiter({ capacity: 2, refillPerSecond: 1 });
    attempt();
    attempt();
    expect(attempt().isAllowed).toBe(false);
    advance(ONE_SECOND);
    expect(attempt().isAllowed).toBe(true);
    expect(attempt().isAllowed).toBe(false);
  });

  it("does not hand out a token before a full one has been earned", () => {
    const { attempt, advance } = makeLimiter({ capacity: 1, refillPerSecond: 1 });
    attempt();
    advance(ONE_SECOND - 1);
    expect(attempt().isAllowed).toBe(false);
    advance(1);
    expect(attempt().isAllowed).toBe(true);
  });

  it("keeps partial progress when a blocked caller keeps retrying", () => {
    const { attempt, advance } = makeLimiter({ capacity: 1, refillPerSecond: 1 });
    attempt();
    const results: boolean[] = [];
    for (let retry = 0; retry < 4; retry++) {
      advance(250);
      results.push(attempt().isAllowed);
    }
    expect(results).toEqual([false, false, false, true]);
  });

  it("does not punish a blocked caller for hammering: blocked attempts cost nothing", () => {
    const { attempt, advance } = makeLimiter({ capacity: 1, refillPerSecond: 1 });
    attempt();
    for (let hammer = 0; hammer < 50; hammer++) attempt();
    advance(ONE_SECOND);
    expect(attempt().isAllowed).toBe(true);
  });

  it("never stores more than the capacity, however long the caller was away", () => {
    const { attempt, advance } = makeLimiter({ capacity: 3, refillPerSecond: 1 });
    attempt();
    advance(ONE_HOUR);
    const allowed = [attempt(), attempt(), attempt(), attempt()].map(result => result.isAllowed);
    expect(allowed).toEqual([true, true, true, false]);
  });

  it("limits each key on its own, so one noisy key cannot block another", () => {
    const { attempt } = makeLimiter({ capacity: 1, refillPerSecond: 1 });
    expect(attempt("ip:10.0.0.1").isAllowed).toBe(true);
    expect(attempt("ip:10.0.0.1").isAllowed).toBe(false);
    expect(attempt("ip:10.0.0.2").isAllowed).toBe(true);
  });
});
