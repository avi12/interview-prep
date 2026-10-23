export type Session = {
  id: string;
  userId: string | null;
  expiresAt: number;
};

export const SESSION_ID_BYTES = 32;
export const ID_ENCODING = "base64url";
export const COOKIE_NAME = "__Host-sid";

export function generateSessionId() {
  return "";
}

export function sessionCookie(_input: {
  sessionId: string;
  maxAgeSeconds: number;
}) {
  return "";
}

export function createSessionManager(_input: {
  now: () => number;
  generateId: () => string;
  ttlMs: number;
}) {
  const _sessions = new Map<string, Session>();

  function start(): Session {
    return {
      id: "",
      userId: null,
      expiresAt: 0
    };
  }

  function get(_sessionId: string): Session | undefined {
    return undefined;
  }

  function login({ sessionId: _sessionId, userId }: {
    sessionId: string;
    userId: string;
  }): Session {
    return {
      id: "",
      userId,
      expiresAt: 0
    };
  }

  function destroy(_sessionId: string) {}

  return {
    start,
    get,
    login,
    destroy
  };
}
