import { readFile } from "node:fs/promises";
import {
  extname,
  isAbsolute,
  relative,
  resolve,
  sep
} from "node:path";

const PARENT_SEGMENT = "..";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".wasm": "application/wasm",
  ".zip": "application/zip",
  ".whl": "application/zip"
};
const FALLBACK_CONTENT_TYPE = "application/octet-stream";

function decodePath(path: string) {
  try {
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

export function resolveInside({ root, path }: {
  root: string;
  path: string;
}) {
  const decoded = decodePath(path);
  if (decoded === null || decoded.includes("\0") || decoded.includes("\\")) {
    return null;
  }

  const absolute = resolve(root, `.${decoded.startsWith("/") ? decoded : `/${decoded}`}`);
  const fromRoot = relative(root, absolute);
  if (fromRoot === "" || isAbsolute(fromRoot) || fromRoot.split(sep).includes(PARENT_SEGMENT)) {
    return null;
  }

  return absolute;
}

export function readFileOrNull(path: string) {
  return readFile(path).catch(() => null);
}

export function contentTypeOf(path: string) {
  return CONTENT_TYPES[extname(path).toLowerCase()] ?? FALLBACK_CONTENT_TYPE;
}
