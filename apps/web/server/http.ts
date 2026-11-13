import type { Context } from "hono";

import type { zod } from "@/lib/zod.ts";

export const HttpStatus = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500
} as const;

export const ErrorCode = {
  UNAUTHORIZED: "unauthorized",
  INVALID_BODY: "invalid_body",
  UNKNOWN_LESSONS: "unknown_lessons",
  PAYLOAD_TOO_LARGE: "payload_too_large",
  RATE_LIMITED: "rate_limited",
  NOT_FOUND: "not_found",
  METHOD_NOT_ALLOWED: "method_not_allowed",
  SERVER_ERROR: "server_error"
} as const;

export const CacheControl = {
  NO_STORE: "no-store",
  REVALIDATE: "no-cache",
  IMMUTABLE: "public, max-age=31536000, immutable"
} as const;

export function sendError({
  context,
  status,
  error,
  details
}: {
  context: Context;
  status: (typeof HttpStatus)[keyof typeof HttpStatus];
  error: (typeof ErrorCode)[keyof typeof ErrorCode];
  details?: Record<string, unknown>;
}) {
  return context.json(
    {
      error,
      ...details
    },
    status
  );
}

export function sendJson<T>({ context, schema, value }: { context: Context; schema: zod.ZodType<T>; value: T }) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return sendError({
      context,
      status: HttpStatus.SERVER_ERROR,
      error: ErrorCode.SERVER_ERROR
    });
  }

  return context.json(parsed.data, HttpStatus.OK);
}
