export const MS_PER_SECOND = 1000;

export function createTokenBucketLimiter(_input: {
  capacity: number;
  refillPerSecond: number;
  now: () => number;
}) {
  function tryConsume(_key: string) {
    return {
      isAllowed: true,
      retryAfterSeconds: 0
    };
  }

  return { tryConsume };
}
