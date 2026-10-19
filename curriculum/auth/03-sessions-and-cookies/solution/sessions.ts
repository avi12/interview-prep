import { randomBytes } from "node:crypto";

export type Session = { id: string; userId: string | null; expiresAt: number };

const SESSION_ID_BYTES = 32;
const ID_ENCODING = "base64url";
const COOKIE_NAME = "__Host-sid";
const COOKIE_ATTRIBUTES = ["Path=/", "HttpOnly", "Secure", "SameSite=Lax"];

export const generateSessionId = () => randomBytes(SESSION_ID_BYTES).toString(ID_ENCODING);

export function sessionCookie({ sessionId, maxAgeSeconds }: { sessionId: string; maxAgeSeconds: number }) {
  return [`${COOKIE_NAME}=${sessionId}`, `Max-Age=${maxAgeSeconds}`, ...COOKIE_ATTRIBUTES].join("; ");
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

  const open = (userId: string | null) => {
    const session: Session = { id: generateId(), userId, expiresAt: now() + ttlMs };
    sessions.set(session.id, session);
    return session;
  };

  const destroy = (sessionId: string) => {
    sessions.delete(sessionId);
  };

  const get = (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) return undefined;
    if (now() < session.expiresAt) return session;
    destroy(sessionId);
    return undefined;
  };

  const start = () => open(null);

  const login = ({ sessionId, userId }: { sessionId: string; userId: string }) => {
    destroy(sessionId);
    return open(userId);
  };

  return { start, get, login, destroy };
}
