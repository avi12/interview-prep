import type { BackoffInput, RetryOptions } from "../starter/retry.ts";
import { loadImpl } from "#kit/impl.ts";
import { createSeededRandom } from "#kit/random.ts";
import { describe, expect, it } from "vitest";

type Module = {
  backoffDelayMs: (input: BackoffInput) => number;
  retry: <T>(options: RetryOptions<T>) => Promise<T>;
};

const { backoffDelayMs, retry } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "retry.ts"
});

const BASE_DELAY_MS = 100;
const MAX_DELAY_MS = 1000;
const SAMPLE_COUNT = 200;
const SEED = 42;

function alwaysMax() {
  return 1;
}
function alwaysHalf() {
  return 0.5;
}
function alwaysZero() {
  return 0;
}

function createSleepRecorder() {
  const delays: number[] = [];
  async function sleep(delayMs: number) {
    delays.push(delayMs);
  }
  return {
    sleep,
    delays
  };
}

function createFlakyOperation({ failures, value = "ok" }: {
  failures: number;
  value?: string;
}) {
  const attempts: number[] = [];
  async function operation(attempt: number) {
    attempts.push(attempt);

    if (attempts.length <= failures) {
      throw new Error(`failure ${attempts.length}`);
    }

    return value;
  }
  return {
    operation,
    attempts
  };
}

function options(overrides: Partial<RetryOptions<string>> & Pick<RetryOptions<string>, "operation" | "sleep">): RetryOptions<string> {
  return {
    isRetryable: () => true,
    maxAttempts: 5,
    baseDelayMs: BASE_DELAY_MS,
    maxDelayMs: MAX_DELAY_MS,
    random: alwaysMax,
    ...overrides
  };
}

describe("backoffDelayMs", () => {
  function delay(retryIndex: number, random: () => number) {
    return backoffDelayMs({
      retryIndex,
      baseDelayMs: BASE_DELAY_MS,
      maxDelayMs: MAX_DELAY_MS,
      random
    });
  }

  it("doubles the ceiling after every retry", () => {
    expect([0, 1, 2, 3].map(index => delay(index, alwaysMax))).toEqual([100, 200, 400, 800]);
  });

  it("stops growing at the cap", () => {
    expect(delay(4, alwaysMax)).toBe(MAX_DELAY_MS);
    expect(delay(20, alwaysMax)).toBe(MAX_DELAY_MS);
  });

  it("applies the cap before the jitter, so a late retry still waits a random share of the cap", () => {
    expect(delay(6, alwaysHalf)).toBe(MAX_DELAY_MS / 2);
    expect(delay(6, () => 0.25)).toBe(MAX_DELAY_MS / 4);
  });

  it("picks a random point between zero and the ceiling (full jitter)", () => {
    expect(delay(0, alwaysZero)).toBe(0);
    expect(delay(0, alwaysHalf)).toBe(50);
    expect(delay(2, () => 0.25)).toBe(100);
  });

  it("spreads delays out: with a seeded generator they differ and stay inside the ceiling", () => {
    const random = createSeededRandom(SEED);
    const delays = Array.from({ length: SAMPLE_COUNT }, () => delay(3, random));
    expect(delays.every(value => value >= 0 && value <= 800)).toBe(true);
    expect(new Set(delays).size).toBeGreaterThan(SAMPLE_COUNT / 2);
  });
});

describe("retry", () => {
  it("returns the value without sleeping when the first attempt works", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation, attempts } = createFlakyOperation({ failures: 0 });
    await expect(
      retry(
        options({
          operation,
          sleep
        })
      )
    ).resolves.toBe("ok");
    expect(attempts).toEqual([0]);
    expect(delays).toEqual([]);
  });

  it("retries until the operation succeeds, and passes the attempt number", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation, attempts } = createFlakyOperation({
      failures: 2,
      value: "done"
    });
    await expect(
      retry(
        options({
          operation,
          sleep
        })
      )
    ).resolves.toBe("done");
    expect(attempts).toEqual([0, 1, 2]);
    expect(delays).toHaveLength(2);
  });

  it("sleeps for exponentially growing delays, capped", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation } = createFlakyOperation({ failures: 6 });
    await retry(
      options({
        operation,
        sleep,
        maxAttempts: 7,
        random: alwaysMax
      })
    );
    expect(delays).toEqual([100, 200, 400, 800, 1000, 1000]);
  });

  it("uses the injected random for jitter", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation } = createFlakyOperation({ failures: 2 });
    await retry(
      options({
        operation,
        sleep,
        random: alwaysHalf
      })
    );
    expect(delays).toEqual([50, 100]);
  });

  it("gives up after maxAttempts, throws the last error and does not sleep after it", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation, attempts } = createFlakyOperation({ failures: 99 });
    await expect(
      retry(
        options({
          operation,
          sleep,
          maxAttempts: 3
        })
      )
    ).rejects.toThrow("failure 3");
    expect(attempts).toHaveLength(3);
    expect(delays).toHaveLength(2);
  });

  it("does not retry when maxAttempts is 1", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation, attempts } = createFlakyOperation({ failures: 99 });
    await expect(
      retry(
        options({
          operation,
          sleep,
          maxAttempts: 1
        })
      )
    ).rejects.toThrow("failure 1");
    expect(attempts).toHaveLength(1);
    expect(delays).toEqual([]);
  });

  it("does not retry an error that is not retryable", async () => {
    const { sleep, delays } = createSleepRecorder();
    const { operation, attempts } = createFlakyOperation({ failures: 99 });
    function isRetryable() {
      return false;
    }
    await expect(
      retry(
        options({
          operation,
          sleep,
          isRetryable
        })
      )
    ).rejects.toThrow("failure 1");
    expect(attempts).toHaveLength(1);
    expect(delays).toEqual([]);
  });

  it("stops as soon as a retryable error is followed by a non-retryable one", async () => {
    const { sleep } = createSleepRecorder();
    const { operation, attempts } = createFlakyOperation({ failures: 99 });
    function isRetryable(error: unknown) {
      return error instanceof Error && error.message === "failure 1";
    }
    await expect(
      retry(
        options({
          operation,
          sleep,
          isRetryable
        })
      )
    ).rejects.toThrow("failure 2");
    expect(attempts).toHaveLength(2);
  });

  it("waits for the sleep to finish before the next attempt", async () => {
    const pendingSleeps: Array<() => void> = [];
    function sleep() {
      return new Promise<void>(resolve => {
        pendingSleeps.push(resolve);
      });
    }
    const { operation, attempts } = createFlakyOperation({ failures: 1 });
    const pending = retry(
      options({
        operation,
        sleep
      })
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(attempts).toHaveLength(1);
    for (const release of pendingSleeps) {
      release();
    }
    await pending;
    expect(attempts).toHaveLength(2);
  });
});
