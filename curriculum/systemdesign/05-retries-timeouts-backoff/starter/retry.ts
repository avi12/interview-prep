export type RetryOptions<T> = {
  operation: (attempt: number) => Promise<T>;
  isRetryable: (error: unknown) => boolean;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  sleep: (delayMs: number) => Promise<void>;
  random: () => number;
};

export type BackoffInput = {
  retryIndex: number;
  baseDelayMs: number;
  maxDelayMs: number;
  random: () => number;
};

export const BACKOFF_FACTOR = 2;

export function backoffDelayMs(_input: BackoffInput) {
  return 0;
}

export async function retry<T>({ operation }: RetryOptions<T>) {
  return operation(0);
}
