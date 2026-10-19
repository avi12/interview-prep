import { afterEach, describe, expect, it, vi } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import type { Session } from "../starter/sessions.ts";

type Module = {
  generateSessionId: () => string;
  sessionCookie: (input: { sessionId: string; maxAgeSeconds: number }) => string;
  createSessionManager: (input: { now: () => number; generateId: () => string; ttlMs: number }) => {
    start: () => Session;
    get: (sessionId: string) => Session | undefined;
    login: (input: { sessionId: string; userId: string }) => Session;
    destroy: (sessionId: string) => void;
  };
};

const { generateSessionId, sessionCookie, createSessionManager } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "sessions.ts"
});

const START_MS = 1_900_000_000_000;
const TTL_MS = 60_000;
const ID_COUNT = 1000;
const MIN_ID_LENGTH = 22;
const ONE_HOUR_SECONDS = 3600;
const FROZEN_RANDOM = 0.5;

afterEach(() => {
  vi.restoreAllMocks();
});

const parseSetCookie = (header: string) => {
  const [pair, ...rawAttributes] = header.split(";").map(part => part.trim());
  const [name, ...valueParts] = pair.split("=");
  const attributes = new Map(
    rawAttributes.map(attribute => {
      const [key, ...rest] = attribute.split("=");
      return [key.toLowerCase(), rest.join("=")] as const;
    })
  );
  return { name, value: valueParts.join("="), attributes };
};

const makeManager = () => {
  let currentMs = START_MS;
  let idCounter = 0;
  const manager = createSessionManager({
    now: () => currentMs,
    generateId: () => `session-${++idCounter}`,
    ttlMs: TTL_MS
  });
  const advance = (ms: number) => {
    currentMs += ms;
  };
  return { manager, advance };
};

describe("generateSessionId", () => {
  it("returns at least 128 bits of URL-safe text", () => {
    expect(generateSessionId()).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generateSessionId().length).toBeGreaterThanOrEqual(MIN_ID_LENGTH);
  });

  it("never repeats", () => {
    const ids = new Set(Array.from({ length: ID_COUNT }, generateSessionId));
    expect(ids.size).toBe(ID_COUNT);
  });

  it("is random in every position, so it is not a counter, a timestamp or a UUID with fixed characters", () => {
    const ids = Array.from({ length: ID_COUNT }, generateSessionId);
    for (let position = 0; position < ids[0].length; position++) {
      const characters = new Set(ids.map(id => id[position]));
      expect(characters.size, `character ${position} never changes`).toBeGreaterThan(1);
    }
  });

  it("does not come from Math.random or the clock, which an attacker can predict", () => {
    vi.spyOn(Math, "random").mockReturnValue(FROZEN_RANDOM);
    vi.spyOn(Date, "now").mockReturnValue(START_MS);
    const ids = new Set(Array.from({ length: ID_COUNT }, generateSessionId));
    expect(ids.size).toBe(ID_COUNT);
  });
});

describe("sessionCookie", () => {
  const cookie = parseSetCookie(sessionCookie({ sessionId: "abc123", maxAgeSeconds: ONE_HOUR_SECONDS }));

  it("carries the session id under a __Host- prefixed name", () => {
    expect(cookie.name.startsWith("__Host-")).toBe(true);
    expect(cookie.value).toBe("abc123");
  });

  it("is HttpOnly, so page scripts cannot read it", () => {
    expect(cookie.attributes.has("httponly")).toBe(true);
  });

  it("is Secure, so it only travels over HTTPS", () => {
    expect(cookie.attributes.has("secure")).toBe(true);
  });

  it("sets SameSite explicitly to Lax or Strict, never None", () => {
    expect(["lax", "strict"]).toContain(cookie.attributes.get("samesite")?.toLowerCase());
  });

  it("follows the __Host- rules: Path=/ and no Domain", () => {
    expect(cookie.attributes.get("path")).toBe("/");
    expect(cookie.attributes.has("domain")).toBe(false);
  });

  it("sets Max-Age in seconds", () => {
    expect(cookie.attributes.get("max-age")).toBe(String(ONE_HOUR_SECONDS));
  });

  it("keeps Max-Age=0, which is how a cookie is deleted", () => {
    const deleted = parseSetCookie(sessionCookie({ sessionId: "other-id", maxAgeSeconds: 0 }));
    expect(deleted.value).toBe("other-id");
    expect(deleted.attributes.get("max-age")).toBe("0");
  });
});

describe("session manager", () => {
  it("starts an anonymous session that can be read back", () => {
    const { manager } = makeManager();
    const session = manager.start();
    expect(session).toEqual({ id: "session-1", userId: null, expiresAt: START_MS + TTL_MS });
    expect(manager.get("session-1")).toEqual(session);
  });

  it("knows nothing about an id it never issued", () => {
    const { manager } = makeManager();
    expect(manager.get("made-up-by-an-attacker")).toBeUndefined();
  });

  it("expires a session exactly when its time is up", () => {
    const { manager, advance } = makeManager();
    manager.start();
    advance(TTL_MS - 1);
    expect(manager.get("session-1")).toBeDefined();
    advance(1);
    expect(manager.get("session-1")).toBeUndefined();
  });

  it("login gives a NEW session id and the old id stops working (session fixation)", () => {
    const { manager } = makeManager();
    const anonymous = manager.start();
    const loggedIn = manager.login({ sessionId: anonymous.id, userId: "user-7" });
    expect(loggedIn.id).not.toBe(anonymous.id);
    expect(loggedIn.userId).toBe("user-7");
    expect(manager.get(loggedIn.id)).toEqual(loggedIn);
    expect(manager.get(anonymous.id)).toBeUndefined();
  });

  it("never adopts an id chosen by the client at login", () => {
    const { manager } = makeManager();
    const loggedIn = manager.login({ sessionId: "planted-by-attacker", userId: "user-7" });
    expect(loggedIn.id).not.toBe("planted-by-attacker");
    expect(manager.get("planted-by-attacker")).toBeUndefined();
  });

  it("gives the new session a full lifetime from the moment of login", () => {
    const { manager, advance } = makeManager();
    const anonymous = manager.start();
    advance(TTL_MS - 1);
    const loggedIn = manager.login({ sessionId: anonymous.id, userId: "user-7" });
    expect(loggedIn.expiresAt).toBe(START_MS + TTL_MS - 1 + TTL_MS);
  });

  it("destroy ends the session on the server, whatever the browser still holds", () => {
    const { manager } = makeManager();
    const { id } = manager.login({ sessionId: "none", userId: "user-7" });
    manager.destroy(id);
    expect(manager.get(id)).toBeUndefined();
  });

  it("keeps different users' sessions apart", () => {
    const { manager } = makeManager();
    const first = manager.login({ sessionId: "none", userId: "alice" });
    const second = manager.login({ sessionId: "none", userId: "bob" });
    expect(manager.get(first.id)?.userId).toBe("alice");
    expect(manager.get(second.id)?.userId).toBe("bob");
  });
});
