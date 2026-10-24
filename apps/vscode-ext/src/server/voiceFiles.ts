import { HttpStatus, sendData, sendRedirect, sendStatus } from "@/server/respond.ts";
import type { Route } from "@/server/router.ts";
import { VOICE_BUILD_COMMAND, VOICE_BUILD_RELATIVE_DIR, VOICE_PATH } from "@scripts/lib/voice.ts";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const INDEX_FILE = "index.html";
const VOICE_PATH_WITHOUT_SLASH = VOICE_PATH.slice(0, -1);
const PLAIN_TEXT = "text/plain; charset=utf-8";
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".mp3": "audio/mpeg"
};
const MISSING_BUILD_MESSAGE = `The voice tutor page is not built yet. Run this in the repository folder, then reload:\n\n  ${VOICE_BUILD_COMMAND}\n`;

function decodePath(path: string) {
  try {
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

function withIndexFile(relativePath: string) {
  const isDirectory = relativePath === "" || relativePath.endsWith("/");
  return isDirectory ? `${relativePath}${INDEX_FILE}` : relativePath;
}

export function resolveVoiceFile({ buildDir, pathname }: {
  buildDir: string;
  pathname: string;
}) {
  if (!pathname.startsWith(VOICE_PATH)) {
    return null;
  }

  const relativePath = decodePath(pathname.slice(VOICE_PATH.length));
  if (relativePath === null || relativePath.includes("\0")) {
    return null;
  }

  const file = resolve(buildDir, withIndexFile(relativePath));
  return file.startsWith(`${buildDir}${sep}`) ? file : null;
}

export function contentTypeOf(file: string) {
  return CONTENT_TYPES[extname(file).toLowerCase()];
}

async function readServableFile(file: string) {
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) {
    return null;
  }

  return readFile(file);
}

export function voiceFilesRoute(root: string): Route {
  const buildDir = resolve(root, VOICE_BUILD_RELATIVE_DIR);
  return {
    isMatch: pathname => pathname === VOICE_PATH_WITHOUT_SLASH || pathname.startsWith(VOICE_PATH),
    isGuarded: false,
    async handle({ response, pathname }) {
      if (pathname === VOICE_PATH_WITHOUT_SLASH) {
        return sendRedirect({
          response,
          location: VOICE_PATH
        });
      }

      if (!existsSync(buildDir)) {
        return sendData({
          response,
          body: MISSING_BUILD_MESSAGE,
          contentType: PLAIN_TEXT,
          status: HttpStatus.SERVICE_UNAVAILABLE
        });
      }

      const file = resolveVoiceFile({
        buildDir,
        pathname
      });
      const contentType = file ? contentTypeOf(file) : undefined;
      const body = file && contentType ? await readServableFile(file) : null;
      if (!body || !contentType) {
        return sendStatus({
          response,
          status: HttpStatus.NOT_FOUND
        });
      }

      sendData({
        response,
        body,
        contentType
      });
    }
  };
}
