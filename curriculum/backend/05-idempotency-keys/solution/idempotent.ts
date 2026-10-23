import { createHash } from "node:crypto";

export type IdempotentRequest = { headers: Record<string, string>; body: unknown };
export type HandlerResponse = { status: number; headers?: Record<string, string>; body?: unknown };
export type Handler = (request: { body: unknown }) => Promise<HandlerResponse>;

type StoredRequest = { fingerprint: string; response?: HandlerResponse };

const IDEMPOTENCY_KEY_HEADER = "idempotency-key";
const REPLAYED_HEADER = "idempotent-replayed";
const STATUS = { badRequest: 400, conflict: 409, unprocessable: 422 } as const;

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  const sortedEntries = Object.entries(value).sort(([a], [b]) => Number(a > b) - Number(a < b));
  return Object.fromEntries(sortedEntries.map(([key, inner]) => [key, canonicalize(inner)]));
};

export const fingerprintOf = (body: unknown) =>
  createHash("sha256").update(JSON.stringify(canonicalize(body)) ?? "").digest("hex");

const failure = ({ status, message }: { status: number; message: string }) => ({ status, body: { error: message } });

const replayOf = (response: HandlerResponse) => ({
  ...response,
  headers: { ...response.headers, [REPLAYED_HEADER]: "true" }
});

export function createIdempotentHandler({ handler }: { handler: Handler }) {
  const records = new Map<string, StoredRequest>();

  return async ({ headers, body }: IdempotentRequest): Promise<HandlerResponse> => {
    const key = headers[IDEMPOTENCY_KEY_HEADER];
    if (!key) return failure({ status: STATUS.badRequest, message: "Idempotency-Key header is required" });

    const fingerprint = fingerprintOf(body);
    const existing = records.get(key);
    if (existing && existing.fingerprint !== fingerprint) {
      return failure({ status: STATUS.unprocessable, message: "This Idempotency-Key was already used with a different request" });
    }
    if (existing?.response) return replayOf(existing.response);
    if (existing) return failure({ status: STATUS.conflict, message: "A request with this Idempotency-Key is still in progress" });

    records.set(key, { fingerprint });
    try {
      const response = await handler({ body });
      records.set(key, { fingerprint, response });
      return response;
    } catch (error) {
      records.delete(key);
      throw error;
    }
  };
}
