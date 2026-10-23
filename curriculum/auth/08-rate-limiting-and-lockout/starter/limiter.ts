const MS_PER_SECOND = 1000;

export function createTokenBucketLimiter({
  capacity,
  refillPerSecond,
  now
}: {
  capacity: number;
  refillPerSecond: number;
  now: () => number;
}) {
  const tryConsume = (key: string) => ({ isAllowed: true, retryAfterSeconds: 0 });

  return { tryConsume };
}
