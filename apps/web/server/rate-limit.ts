import type { AuthVariables } from "@server/auth.ts";
import { ErrorCode, HttpStatus, sendError } from "@server/http.ts";
import type { Context, Env, MiddlewareHandler } from "hono";

export interface RateLimitOptions {
  capacity: number;
  refillPerSecond: number;
  now?: () => number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const MILLISECONDS_PER_SECOND = 1000;
const MAX_TRACKED_CALLERS = 10_000;
const FORWARDED_FOR_HEADER = "x-forwarded-for";
const UNKNOWN_ADDRESS = "unknown";

export const DEFAULT_RATE_LIMIT = {
  capacity: 30,
  refillPerSecond: 1
} as const satisfies RateLimitOptions;

export const NARRATE_RATE_LIMIT = {
  capacity: 10,
  refillPerSecond: 0.2
} as const satisfies RateLimitOptions;

function createTokenBucket({ capacity, refillPerSecond, now = Date.now }: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  function refilled({ bucket, takenAt }: { bucket: Bucket; takenAt: number }) {
    const elapsedSeconds = (takenAt - bucket.updatedAt) / MILLISECONDS_PER_SECOND;
    return Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);
  }

  function forgetOldest() {
    const oldest = buckets.keys().next();
    if (!oldest.done) {
      buckets.delete(oldest.value);
    }
  }

  return function take(key: string) {
    const takenAt = now();
    const previous = buckets.get(key);
    const tokens =
      previous === undefined
        ? capacity
        : refilled({
            bucket: previous,
            takenAt
          });
    buckets.delete(key);

    if (buckets.size >= MAX_TRACKED_CALLERS) {
      forgetOldest();
    }

    const isAllowed = tokens >= 1;
    buckets.set(key, {
      tokens: isAllowed ? tokens - 1 : tokens,
      updatedAt: takenAt
    });
    return isAllowed;
  };
}

function limiter<Environment extends Env>({
  options,
  keyOf
}: {
  options: RateLimitOptions;
  keyOf: (context: Context<Environment>) => string;
}) {
  const take = createTokenBucket(options);
  return (async (context, next) => {
    if (!take(keyOf(context))) {
      context.header("retry-after", String(Math.ceil(1 / options.refillPerSecond)));
      return sendError({
        context,
        status: HttpStatus.TOO_MANY_REQUESTS,
        error: ErrorCode.RATE_LIMITED
      });
    }

    await next();
  }) satisfies MiddlewareHandler<Environment>;
}

export function rateLimitPerUser(options: RateLimitOptions) {
  return limiter<{ Variables: AuthVariables }>({
    options,
    keyOf: context => context.get("uid")
  });
}

export function rateLimitPerIp(options: RateLimitOptions) {
  return limiter({
    options,
    keyOf(context) {
      const forwarded = context.req.header(FORWARDED_FOR_HEADER)?.split(",").at(-1)?.trim();
      return forwarded || UNKNOWN_ADDRESS;
    }
  });
}
