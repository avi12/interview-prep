import { createHash } from "node:crypto";

export type IdempotentRequest = {
  headers: Record<string, string>;
  body: unknown;
};
export type HandlerResponse = {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
};
export type Handler = (request: { body: unknown }) => Promise<HandlerResponse>;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const sortedEntries = Object.entries(value).sort(([left], [right]) => Number(left > right) - Number(left < right));
  return Object.fromEntries(sortedEntries.map(([key, inner]) => [key, canonicalize(inner)]));
}

export function fingerprintOf(body: unknown) {
  return createHash("sha256").update(JSON.stringify(canonicalize(body)) ?? "").digest("hex");
}

export function createIdempotentHandler({ handler }: { handler: Handler }) {
  return async ({ body }: IdempotentRequest): Promise<HandlerResponse> => handler({ body });
}
