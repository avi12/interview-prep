import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type RetryOptions<T> = {
  operation: (attempt: number) => Promise<T>;
  isRetryable: (error: unknown) => boolean;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
};
type Module = {
  backoffDelayMs: (input: { retryIndex: number; baseDelayMs: number; maxDelayMs: number; random: () => number }) => number;
  retry: <T>(options: RetryOptions<T>) => Promise<T>;
};

const { backoffDelayMs, retry } = await loadImpl<Module>({ testUrl: import.meta.url, file: "retry.ts" });

const BASE_DELAY_MS = 100;
const MAX_DELAY_MS = 1000;
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;
const LCG_MODULUS = 2 ** 32;
const SAMPLE_COUNT = 200;
const SEED = 42;

const seededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
    return state / LCG_MODULUS;
  };
};

const ALWAYS_MAX = () => 1;
const ALWAYS_HALF = () => 0.5;
const ALWAYS_ZERO = () => 0;

const createSleepRecorder = () => {
  const delays: number[] = [];
  const sleep = async (ms: number) => {
    delays.push(ms);
  };
  return { sleep, delays };
};

const createFlakyOperation = ({ failures, value = "ok" }: { failures: number; value?: string }) => {
  const attempts: number[] = [];
  const operation = async (attempt: number) => {
    attempts.push(attempt);
    if (attempts.length <= failures) throw new Error(`failure ${attempts.length}`);
    return value;
  };
  return { operation, attempts };
};

const options = (overrides: Partial<RetryOptions<string>> & Pick<RetryOptions<string>, "operation" | "sleep">): RetryOptions<string> => ({
  isRetryable: () => true,
  maxAttempts: 5,
  baseDelayMs: BASE_DELAY_MS,
  maxDelayMs: MAX_DELAY_MS,
  random: ALWAYS_MAX,
  ...overrides
});

describe("backoffDelayMs", () => {
  const delay = (retryIndex: number, random: () => number) =>
    backoffDelayMs({ retryIndex, baseDelayMs: BASE_DELAY_MS, maxDelayMs: MAX_DELAY_MS, random });

  it("doubles the ceiling after every retry", () => {
    expect([0, 1, 2, 3].map(index => delay(index, ALWAYS_MAX))).toEqual([100, 200, 400, 800]);
  });

  it("stops growing at the cap", () => {
    expect(delay(4, ALWAYS_MAX)).toBe(MAX_DELAY_MS);
    expect(delay(20, ALWAYS_MAX)).toBe(MAX_DELAY_MS);
  });

  it("picks a random point between zero and the ceiling (full jitter)", () => {
    expect(delay(0, ALWAYS_ZERO)).toBe(0);
    expect(delay(0, ALWAYS_HALF)).toBe(50);
    expect(delay(2, () => 0.25)).toBe(100);
  });

  it("spreads delays out: with a seeded generator they differ and stay inside the ceiling", () => {
    const random = seededRandom(SEED);
    const delays = Array.from({ length: SAMPLE_COUNT }, () => delay(3, random));
    expect(delays.every(value => value >= 0 && value <= 800)).toBe(true);
    expect(new Set(delays).size).toBeGreaterThan(SAMPLE_COUNT / 2);
  });
});

describe("retry", () => {
  it("returns the value without sleeping when the first attempt works", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation, attempts } = createFlakyOperation({ failures: 0 });
    await expect(retry(options({ operation, sleep }))).resolves.toBe("ok");
    expect(attempts).toEqual([0]);
    expect(delays).toEqual([]);
  });

  it("retries until the operation succeeds, and passes the attempt number", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation, attempts } = createFlakyOperation({ failures: 2, value: "done" });
    await expect(retry(options({ operation, sleep }))).resolves.toBe("done");
    expect(attempts).toEqual([0, 1, 2]);
    expect(delays).toHaveLength(2);
  });

  it("sleeps for exponentially growing delays, capped", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation } = createFlakyOperation({ failures: 6 });
    await retry(options({ operation, sleep, maxAttempts: 7, random: ALWAYS_MAX }));
    expect(delays).toEqual([100, 200, 400, 800, 1000, 1000]);
  });

  it("uses the injected random for jitter", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation } = createFlakyOperation({ failures: 2 });
    await retry(options({ operation, sleep, random: ALWAYS_HALF }));
    expect(delays).toEqual([50, 100]);
  });

  it("gives up after maxAttempts, throws the last error and does not sleep after it", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation, attempts } = createFlakyOperation({ failures: 99 });
    await expect(retry(options({ operation, sleep, maxAttempts: 3 }))).rejects.toThrow("failure 3");
    expect(attempts).toHaveLength(3);
    expect(delays).toHaveLength(2);
  });

  it("does not retry when maxAttempts is 1", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation, attempts } = createFlakyOperation({ failures: 99 });
    await expect(retry(options({ operation, sleep, maxAttempts: 1 }))).rejects.toThrow("failure 1");
    expect(attempts).toHaveLength(1);
    expect(delays).toEqual([]);
  });

  it("does not retry an error that is not retryable", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation, attempts } = createFlakyOperation({ failures: 99 });
    const isRetryable = () => false;
    await expect(retry(options({ operation, sleep, isRetryable }))).rejects.toThrow("failure 1");
    expect(attempts).toHaveLength(1);
    expect(delays).toEqual([]);
  });

  it("stops as soon as a retryable error is followed by a non-retryable one", async () => {
    const { sleep } = createSleepRecorder();
    const { operation, attempts } = createFlakyOperation({ failures: 99 });
    const isRetryable = (error: unknown) => (error as Error).message === "failure 1";
    await expect(retry(options({ operation, sleep, isRetryable }))).rejects.toThrow("failure 2");
    expect(attempts).toHaveLength(2);
  });

  it("waits for the sleep to finish before the next attempt", async () => {
    let release = () => {};
    const sleep = () => new Promise<void>(resolve => (release = resolve));
    const { operation, attempts } = createFlakyOperation({ failures: 1 });
    const pending = retry(options({ operation, sleep }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(attempts).toHaveLength(1);
    release();
    await pending;
    expect(attempts).toHaveLength(2);
  });
});
