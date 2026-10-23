type Bucket = {
  tokens: number;
  updatedAt: number;
};

const MS_PER_SECOND = 1000;
const COST_PER_ATTEMPT = 1;

export function createTokenBucketLimiter({
  capacity,
  refillPerSecond,
  now
}: {
  capacity: number;
  refillPerSecond: number;
  now: () => number;
}) {
  const buckets = new Map<string, Bucket>();

  function refilled({ bucket, currentMs }: {
    bucket: Bucket;
    currentMs: number;
  }) {
    const elapsedSeconds = (currentMs - bucket.updatedAt) / MS_PER_SECOND;
    return Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);
  }

  function tryConsume(key: string) {
    const currentMs = now();
    const bucket = buckets.get(key) ?? {
      tokens: capacity,
      updatedAt: currentMs
    };
    const tokens = refilled({
      bucket,
      currentMs
    });
    if (tokens < COST_PER_ATTEMPT) {
      buckets.set(key, {
        tokens,
        updatedAt: currentMs
      });
      const retryAfterSeconds = Math.ceil((COST_PER_ATTEMPT - tokens) / refillPerSecond);
      return {
        isAllowed: false,
        retryAfterSeconds
      };
    }

    buckets.set(key, {
      tokens: tokens - COST_PER_ATTEMPT,
      updatedAt: currentMs
    });
    return {
      isAllowed: true,
      retryAfterSeconds: 0
    };
  }

  return { tryConsume };
}
