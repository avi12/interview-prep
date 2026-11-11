import type { z } from "@/lib/zod.ts";
import type { Context } from "hono";

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
  unauthorized: "unauthorized",
  invalidBody: "invalid_body",
  unknownLessons: "unknown_lessons",
  payloadTooLarge: "payload_too_large",
  rateLimited: "rate_limited",
  notFound: "not_found",
  methodNotAllowed: "method_not_allowed",
  serverError: "server_error"
} as const;

export const CacheControl = {
  noStore: "no-store",
  revalidate: "no-cache",
  immutable: "public, max-age=31536000, immutable"
} as const;

export function sendError({ context, status, error, details }: {
  context: Context;
  status: (typeof HttpStatus)[keyof typeof HttpStatus];
  error: (typeof ErrorCode)[keyof typeof ErrorCode];
  details?: Record<string, unknown>;
}) {
  return context.json({
    error,
    ...details
  }, status);
}

export function sendJson<T>({ context, schema, value }: {
  context: Context;
  schema: z.ZodType<T>;
  value: T;
}) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return sendError({
      context,
      status: HttpStatus.SERVER_ERROR,
      error: ErrorCode.serverError
    });
  }

  return context.json(parsed.data, HttpStatus.OK);
}
