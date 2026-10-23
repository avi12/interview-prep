import { randomBytes } from "node:crypto";

export type Session = { id: string; userId: string | null; expiresAt: number };

const SESSION_ID_BYTES = 32;
const ID_ENCODING = "base64url";
const COOKIE_NAME = "__Host-sid";

export const generateSessionId = () => "";

export function sessionCookie({ sessionId, maxAgeSeconds }: { sessionId: string; maxAgeSeconds: number }) {
  return "";
}

export function createSessionManager({
  now,
  generateId,
  ttlMs
}: {
  now: () => number;
  generateId: () => string;
  ttlMs: number;
}) {
  const sessions = new Map<string, Session>();

  const start = (): Session => ({ id: "", userId: null, expiresAt: 0 });

  const get = (sessionId: string): Session | undefined => undefined;

  const login = ({ sessionId, userId }: { sessionId: string; userId: string }): Session => ({ id: "", userId, expiresAt: 0 });

  const destroy = (sessionId: string) => {};

  return { start, get, login, destroy };
}
