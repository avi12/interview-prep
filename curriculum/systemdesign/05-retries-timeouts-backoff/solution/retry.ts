export type RetryOptions<T> = {
  operation: (attempt: number) => Promise<T>;
  isRetryable: (error: unknown) => boolean;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
};

export type BackoffInput = {
  retryIndex: number;
  baseDelayMs: number;
  maxDelayMs: number;
  random: () => number;
};

const BACKOFF_FACTOR = 2;

export const backoffDelayMs = ({ retryIndex, baseDelayMs, maxDelayMs, random }: BackoffInput) =>
  random() * Math.min(maxDelayMs, baseDelayMs * BACKOFF_FACTOR ** retryIndex);

export const retry = async <T>({
  operation,
  isRetryable,
  maxAttempts,
  baseDelayMs,
  maxDelayMs,
  sleep,
  random
}: RetryOptions<T>) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      const isLastAttempt = attempt + 1 >= maxAttempts;
      if (isLastAttempt || !isRetryable(error)) throw error;
      await sleep(backoffDelayMs({ retryIndex: attempt, baseDelayMs, maxDelayMs, random }));
    }
  }
};
