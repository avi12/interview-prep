import { API_PATH as API_PREFIX } from "@/lib/web-paths.ts";
import { requireUser, type VerifyIdToken } from "@server/auth.ts";
import { CacheControl, ErrorCode, HttpStatus, sendError } from "@server/http.ts";
import { type Log, requestLogger, Severity } from "@server/logging.ts";
import { progressRoutes } from "@server/progress-routes.ts";
import type { ProgressStore } from "@server/progress-store.ts";
import { DEFAULT_RATE_LIMIT, type RateLimitOptions, rateLimitPerUser } from "@server/rate-limit.ts";
import { securityHeaders } from "@server/security.ts";
import { clientRoutes, courseRoutes, runnerRoutes } from "@server/static-routes.ts";
import { HEALTH_PATH } from "#scripts/lib/gcp.ts";
import { INDEX_RELATIVE_PATH, PAGE_STYLE_PATHS, RUNNER_DIST_RELATIVE_DIR } from "#scripts/lib/layout.ts";
import { PROGRESS_API_PATH } from "#scripts/lib/progress-sync.ts";
import { lessonIndexSchema } from "#scripts/lib/schema.ts";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const MAX_BODY_BYTES = 64 * 1024;

export interface AppDependencies {
  verifyIdToken: VerifyIdToken;
  progressStore: ProgressStore;
  clientRoot: string;
  contentRoot: string;
  log: Log;
  rateLimit?: RateLimitOptions;
}

function readLessons(indexFile: string) {
  return lessonIndexSchema.parse(JSON.parse(readFileSync(indexFile, "utf8"))).lessons;
}

function courseFilesOf(lessons: ReturnType<typeof readLessons>) {
  return new Set([
    INDEX_RELATIVE_PATH,
    ...PAGE_STYLE_PATHS,
    ...lessons.map(lesson => lesson.html)
  ]);
}

export function createApp(dependencies: AppDependencies) {
  const { verifyIdToken, progressStore, clientRoot, contentRoot, log, rateLimit = DEFAULT_RATE_LIMIT } = dependencies;
  const lessons = readLessons(resolve(contentRoot, INDEX_RELATIVE_PATH));
  const lessonIds = new Set(lessons.map(lesson => lesson.id));
  const lessonTitles = new Map(lessons.map(lesson => [lesson.id, lesson.title]));

  const api = new Hono()
    .use(async (context, next) => {
      await next();
      context.header("cache-control", CacheControl.noStore);
    })
    .use(requireUser(verifyIdToken))
    .use(rateLimitPerUser(rateLimit))
    .use(
      bodyLimit({
        maxSize: MAX_BODY_BYTES,
        onError: context => sendError({
          context,
          status: HttpStatus.PAYLOAD_TOO_LARGE,
          error: ErrorCode.payloadTooLarge
        })
      })
    )
    .route(
      PROGRESS_API_PATH.slice(API_PREFIX.length), progressRoutes({
        progressStore,
        lessonIds
      })
    )
    .all("*", context => sendError({
      context,
      status: HttpStatus.NOT_FOUND,
      error: ErrorCode.notFound
    }));

  return new Hono()
    .use(requestLogger(log))
    .use(...securityHeaders)
    .onError((error, context) => {
      log({
        severity: Severity.error,
        message: `Unhandled error on ${context.req.method} ${context.req.path}: ${error.message}`
      });
      return sendError({
        context,
        status: HttpStatus.SERVER_ERROR,
        error: ErrorCode.serverError
      });
    })
    .get(HEALTH_PATH, context => {
      context.header("cache-control", CacheControl.noStore);
      return context.text("ok");
    })
    .route(API_PREFIX, api)
    .route(
      "/", courseRoutes({
        contentRoot,
        courseFiles: courseFilesOf(lessons)
      })
    )
    .route("/", runnerRoutes(resolve(contentRoot, RUNNER_DIST_RELATIVE_DIR)))
    .route(
      "/", clientRoutes({
        clientRoot,
        lessonTitles
      })
    );
}
