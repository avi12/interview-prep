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

export const backoffDelayMs = ({ retryIndex, baseDelayMs, maxDelayMs, random }: BackoffInput) => {
  return 0;
};

export const retry = async <T>({ operation }: RetryOptions<T>) => {
  return operation(0);
};
