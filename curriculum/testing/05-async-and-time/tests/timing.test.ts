import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Module = typeof import("../starter/timing.ts");

const { retry, isExpired } = await loadImpl<Module>({ testUrl: import.meta.url, file: "timing.ts" });

const DELAY_MS = 1000;
const ONE_MILLISECOND = 1;
const TTL_MS = 500;
const ISSUED_AT = 1000;

const failingThenSucceeding = (failures: number) => {
  let calls = 0;
  return vi.fn(async () => {
    calls++;
    if (calls <= failures) throw new Error(`failure ${calls}`);
    return "ok";
  });
};

const alwaysFailing = () => {
  let calls = 0;
  return vi.fn(async (): Promise<string> => {
    calls++;
    throw new Error(`failure ${calls}`);
  });
};

describe("retry with fake timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the result at once when the first attempt succeeds", async () => {
    const task = failingThenSucceeding(0);

    const result = await retry({ task, attempts: 3, delayMs: DELAY_MS });

    expect(result).toBe("ok");
    expect(task).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits the whole delay before the second attempt", async () => {
    const task = failingThenSucceeding(1);
    const outcome = retry({ task, attempts: 3, delayMs: DELAY_MS });

    await vi.advanceTimersByTimeAsync(0);
    expect(task).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(DELAY_MS - ONE_MILLISECOND);
    expect(task).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(ONE_MILLISECOND);
    expect(task).toHaveBeenCalledTimes(2);
    await expect(outcome).resolves.toBe("ok");
  });

  it("waits the same delay before every further attempt", async () => {
    const task = failingThenSucceeding(2);
    const outcome = retry({ task, attempts: 3, delayMs: DELAY_MS });

    await vi.advanceTimersByTimeAsync(DELAY_MS);
    expect(task).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(DELAY_MS - ONE_MILLISECOND);
    expect(task).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(ONE_MILLISECOND);
    expect(task).toHaveBeenCalledTimes(3);
    await expect(outcome).resolves.toBe("ok");
  });

  it("keeps the result of the attempt that finally succeeds", async () => {
    const task = failingThenSucceeding(2);
    const outcome = retry({ task, attempts: 5, delayMs: DELAY_MS });

    await vi.runAllTimersAsync();

    await expect(outcome).resolves.toBe("ok");
    expect(task).toHaveBeenCalledTimes(3);
  });

  it("gives up after the last attempt and throws the last error", async () => {
    const task = alwaysFailing();
    const outcome = expect(retry({ task, attempts: 3, delayMs: DELAY_MS })).rejects.toThrow("failure 3");

    await vi.runAllTimersAsync();

    await outcome;
    expect(task).toHaveBeenCalledTimes(3);
  });

  it("does not wait after the final failed attempt", async () => {
    const task = alwaysFailing();
    const outcome = expect(retry({ task, attempts: 2, delayMs: DELAY_MS })).rejects.toThrow("failure 2");

    await vi.advanceTimersByTimeAsync(DELAY_MS);

    expect(vi.getTimerCount()).toBe(0);
    await outcome;
  });

  it("tries only once and never waits when attempts is 1", async () => {
    const task = alwaysFailing();
    const outcome = expect(retry({ task, attempts: 1, delayMs: DELAY_MS })).rejects.toThrow("failure 1");

    await vi.advanceTimersByTimeAsync(0);

    expect(vi.getTimerCount()).toBe(0);
    await outcome;
    expect(task).toHaveBeenCalledTimes(1);
  });

  it.each([0, -1])("rejects with a RangeError when attempts is %i, below 1", async attempts => {
    const task = failingThenSucceeding(0);

    const outcome = retry({ task, attempts, delayMs: DELAY_MS });

    await expect(outcome).rejects.toThrow(RangeError);
    expect(task).not.toHaveBeenCalled();
  });
});

describe("isExpired with an injected clock", () => {
  it("is not expired one millisecond before the time to live is up", () => {
    const now = () => ISSUED_AT + TTL_MS - ONE_MILLISECOND;

    expect(isExpired({ issuedAt: ISSUED_AT, ttlMs: TTL_MS, now })).toBe(false);
  });

  it("is expired exactly when the time to live is up", () => {
    const now = () => ISSUED_AT + TTL_MS;

    expect(isExpired({ issuedAt: ISSUED_AT, ttlMs: TTL_MS, now })).toBe(true);
  });

  it("is expired long after the time to live is up", () => {
    const now = () => ISSUED_AT + TTL_MS * 10;

    expect(isExpired({ issuedAt: ISSUED_AT, ttlMs: TTL_MS, now })).toBe(true);
  });
});

describe("isExpired with the real clock, faked", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses Date.now when no clock is given", () => {
    const issuedAt = Date.now();

    expect(isExpired({ issuedAt, ttlMs: TTL_MS })).toBe(false);

    vi.advanceTimersByTime(TTL_MS - ONE_MILLISECOND);
    expect(isExpired({ issuedAt, ttlMs: TTL_MS })).toBe(false);

    vi.advanceTimersByTime(ONE_MILLISECOND);
    expect(isExpired({ issuedAt, ttlMs: TTL_MS })).toBe(true);
  });
});
