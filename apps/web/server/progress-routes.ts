import type { AuthVariables } from "@server/auth.ts";
import { ErrorCode, HttpStatus, sendError, sendJson } from "@server/http.ts";
import type { ProgressStore } from "@server/progress-store.ts";
import type { Context } from "hono";
import { Hono } from "hono";
import type { BlankInput } from "hono/types";

import { mergeProgress, progressResponseSchema, progressUpdateSchema } from "#scripts/lib/progress-sync.ts";

const ALLOWED_METHODS = "GET, PUT";

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function progressRoutes({
  progressStore,
  lessonIds
}: {
  progressStore: ProgressStore;
  lessonIds: ReadonlySet<string>;
}) {
  async function readProgress(context: Context<{ Variables: AuthVariables }, "/", BlankInput>) {
    return sendJson({
      context,
      schema: progressResponseSchema,
      value: {
        progress: await progressStore.read(context.get("uid"))
      }
    });
  }
  return new Hono<{ Variables: AuthVariables }>()
    .get("/", readProgress)
    .put("/", async context => {
      const parsed = progressUpdateSchema.safeParse(parseJson(await context.req.text()));
      if (!parsed.success) {
        return sendError({
          context,
          status: HttpStatus.BAD_REQUEST,
          error: ErrorCode.INVALID_BODY,
          details: {
            issues: parsed.error.issues.map(issue => ({ path: issue.path.map(String) }))
          }
        });
      }

      const unknownIds = Object.keys(parsed.data.progress).filter(id => !lessonIds.has(id));
      if (unknownIds.length > 0) {
        return sendError({
          context,
          status: HttpStatus.BAD_REQUEST,
          error: ErrorCode.UNKNOWN_LESSONS,
          details: {
            ids: unknownIds
          }
        });
      }

      const progress = await progressStore.update({
        uid: context.get("uid"),
        apply: stored =>
          mergeProgress({
            left: stored,
            right: parsed.data.progress
          })
      });
      return sendJson({
        context,
        schema: progressResponseSchema,
        value: {
          progress
        }
      });
    })
    .all("/", context => {
      context.header("allow", ALLOWED_METHODS);
      return sendError({
        context,
        status: HttpStatus.METHOD_NOT_ALLOWED,
        error: ErrorCode.METHOD_NOT_ALLOWED
      });
    });
}
