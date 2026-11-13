import { extname, resolve } from "node:path";

import { contentTypeOf, readFileOrNull, resolveInside } from "@server/files.ts";
import { CacheControl, ErrorCode, HttpStatus, sendError } from "@server/http.ts";
import { RUNNER_WORKER_CSP, WEBVIEW_HOST_CSP } from "@server/security.ts";
import { type Context, Hono } from "hono";

import { lessonIdFromUrl } from "@/lib/lesson-address.ts";
import { COURSE_PATH, HASHED_ASSETS_PATH, RUNNER_PATH, WORKERS_PATH } from "@/lib/web-paths.ts";

const SPA_ENTRY_FILE = "index.html";
const TITLE_PATTERN = /<title>(.*?)<\/title>/;
const TITLE_SEPARATOR = " - ";
const HTML_EXTENSION = ".html";
const HASHED_ASSETS_PREFIX = `${HASHED_ASSETS_PATH}/`;
const COURSE_PREFIX = `${COURSE_PATH}/`;
const RUNNER_PREFIX = `${RUNNER_PATH}/`;
const WORKERS_PREFIX = `${WORKERS_PATH}/`;

function send({
  context,
  body,
  path,
  cacheControl
}: {
  context: Context;
  body: Uint8Array<ArrayBuffer>;
  path: string;
  cacheControl: string;
}) {
  context.header("content-type", contentTypeOf(path));
  context.header("cache-control", cacheControl);
  return context.body(body, HttpStatus.OK);
}

function notFound(context: Context) {
  return sendError({
    context,
    status: HttpStatus.NOT_FOUND,
    error: ErrorCode.NOT_FOUND
  });
}

function isHashedPath(path: string) {
  return path.startsWith(HASHED_ASSETS_PREFIX) || path.startsWith(WORKERS_PREFIX);
}

function isWebviewHostPage(path: string) {
  return path.startsWith(HASHED_ASSETS_PREFIX) && extname(path) === HTML_EXTENSION;
}

function isSpaRoute(path: string) {
  return !path.startsWith(HASHED_ASSETS_PREFIX) && extname(path) === "";
}

function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function withLessonTitle({ entry, lessonTitle }: { entry: Uint8Array<ArrayBuffer>; lessonTitle: string | undefined }) {
  if (lessonTitle === undefined) {
    return entry;
  }

  const html = new TextDecoder()
    .decode(entry)
    .replace(
      TITLE_PATTERN,
      (_match, appTitle: string) => `<title>${escapeHtml(lessonTitle)}${TITLE_SEPARATOR}${appTitle}</title>`
    );
  return new TextEncoder().encode(html);
}

export function courseRoutes({ contentRoot, courseFiles }: { contentRoot: string; courseFiles: ReadonlySet<string> }) {
  return new Hono().get(`${COURSE_PREFIX}*`, async context => {
    const relativePath = context.req.path.slice(COURSE_PREFIX.length);
    const file = courseFiles.has(relativePath)
      ? resolveInside({
          root: contentRoot,
          path: relativePath
        })
      : null;
    const body = file === null ? null : await readFileOrNull(file);
    if (file === null || body === null) {
      return notFound(context);
    }

    return send({
      context,
      body,
      path: file,
      cacheControl: CacheControl.REVALIDATE
    });
  });
}

export function runnerRoutes(runnerRoot: string) {
  return new Hono().get(`${RUNNER_PREFIX}*`, async context => {
    const file = resolveInside({
      root: runnerRoot,
      path: context.req.path.slice(RUNNER_PATH.length)
    });
    const body = file === null ? null : await readFileOrNull(file);
    if (file === null || body === null) {
      return notFound(context);
    }

    return send({
      context,
      body,
      path: file,
      cacheControl: CacheControl.REVALIDATE
    });
  });
}

export function clientRoutes({
  clientRoot,
  lessonTitles
}: {
  clientRoot: string;
  lessonTitles: ReadonlyMap<string, string>;
}) {
  const entryFile = resolve(clientRoot, SPA_ENTRY_FILE);

  async function sendEntry(context: Context) {
    const entry = await readFileOrNull(entryFile);
    if (entry === null) {
      return notFound(context);
    }

    const lessonId = lessonIdFromUrl(new URL(context.req.url));
    return send({
      context,
      body: withLessonTitle({
        entry,
        lessonTitle: lessonId === undefined ? undefined : lessonTitles.get(lessonId)
      }),
      path: entryFile,
      cacheControl: CacheControl.REVALIDATE
    });
  }

  return new Hono().get("*", async context => {
    const { path } = context.req;
    if (path === "/") {
      return sendEntry(context);
    }

    const file = resolveInside({
      root: clientRoot,
      path
    });
    if (file === null) {
      return notFound(context);
    }

    const body = await readFileOrNull(file);
    if (body === null) {
      return isSpaRoute(path) ? sendEntry(context) : notFound(context);
    }

    if (isWebviewHostPage(path)) {
      context.header("content-security-policy", WEBVIEW_HOST_CSP);
    }

    if (path.startsWith(WORKERS_PREFIX)) {
      context.header("content-security-policy", RUNNER_WORKER_CSP);
    }

    return send({
      context,
      body,
      path: file,
      cacheControl: isHashedPath(path) ? CacheControl.IMMUTABLE : CacheControl.REVALIDATE
    });
  });
}
