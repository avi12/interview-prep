import { createHash } from "node:crypto";

export type ConditionalResponse = {
  status: number;
  headers: Record<string, string>;
  body?: unknown;
};

const STATUS = {
  ok: 200,
  notModified: 304
} as const;
const WEAK_PREFIX = "W/";
const ANY_VERSION = "*";

export function etagFor(resource: unknown) {
  return `"${createHash("sha256").update(JSON.stringify(resource)).digest("hex")}"`;
}

function cacheControlFor(maxAgeSeconds: number) {
  return maxAgeSeconds > 0 ? `private, max-age=${maxAgeSeconds}` : "private, no-cache";
}

function withoutWeakPrefix(tag: string) {
  return tag.startsWith(WEAK_PREFIX) ? tag.slice(WEAK_PREFIX.length) : tag;
}

function isMatch({ ifNoneMatch, etag }: {
  ifNoneMatch: string;
  etag: string;
}) {
  const candidates = ifNoneMatch.split(",").map(tag => tag.trim());
  if (candidates.includes(ANY_VERSION)) {
    return true;
  }

  return candidates.some(tag => withoutWeakPrefix(tag) === etag);
}

export function conditionalResponse({
  resource,
  ifNoneMatch,
  maxAgeSeconds
}: {
  resource: unknown;
  ifNoneMatch?: string;
  maxAgeSeconds: number;
}): ConditionalResponse {
  const etag = etagFor(resource);
  const headers = {
    etag,
    "cache-control": cacheControlFor(maxAgeSeconds)
  };
  if (ifNoneMatch && isMatch({
    ifNoneMatch,
    etag
  })) {
    return {
      status: STATUS.notModified,
      headers
    };
  }

  return {
    status: STATUS.ok,
    headers,
    body: resource
  };
}
