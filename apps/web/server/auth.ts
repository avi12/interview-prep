import { ErrorCode, HttpStatus, sendError } from "@server/http.ts";
import type { MiddlewareHandler } from "hono";

export type VerifyIdToken = (token: string) => Promise<string | null>;

export interface AuthVariables {
  uid: string;
}

const BEARER_PATTERN = /^Bearer ([\w.-]{1,4096})$/;

function bearerTokenOf(header: string | undefined) {
  return header === undefined ? null : BEARER_PATTERN.exec(header)?.[1] ?? null;
}

export function requireUser(verifyIdToken: VerifyIdToken): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (context, next) => {
    const token = bearerTokenOf(context.req.header("authorization"));
    const uid = token === null ? null : await verifyIdToken(token);
    if (uid === null) {
      return sendError({
        context,
        status: HttpStatus.UNAUTHORIZED,
        error: ErrorCode.unauthorized
      });
    }

    context.set("uid", uid);
    await next();
  };
}
