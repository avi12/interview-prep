function sleep(durationMs: number) {
  return new Promise<void>(resolve => setTimeout(resolve, durationMs));
}

export async function retry<T>({ task, attempts, delayMs }: {
  task: () => Promise<T>;
  attempts: number;
  delayMs: number;
}): Promise<T> {
  if (attempts < 1) {
    throw new RangeError("attempts must be at least 1");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

export function isExpired({ issuedAt, ttlMs, now = Date.now }: {
  issuedAt: number;
  ttlMs: number;
  now?: () => number;
}) {
  return now() - issuedAt >= ttlMs;
}
