import { MAX_BODY_BYTES } from "@server/app.ts";
import {
  authorized,
  createTestApp,
  KNOWN_LESSON,
  OTHER_LESSON,
  OTHER_TOKEN,
  VALID_TOKEN
} from "@server/test-fixture.ts";
import { describe, expect, it } from "vitest";

import { PROGRESS_API_PATH } from "#scripts/lib/progress-sync.ts";

const EARLY = "2026-01-01T00:00:00.000Z";
const LATE = "2026-03-01T00:00:00.000Z";

function put({ token = VALID_TOKEN, body }: { token?: string; body: string }) {
  return {
    method: "PUT",
    headers: {
      ...authorized(token),
      "content-type": "application/json"
    },
    body
  };
}

describe("auth", () => {
  it("rejects a request without a token", async () => {
    const { app } = createTestApp();
    const response = await app.request(PROGRESS_API_PATH);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("rejects a bad token without echoing it or logging it", async () => {
    const { app, logs } = createTestApp();
    const token = "forged.token.value";
    const response = await app.request(PROGRESS_API_PATH, { headers: authorized(token) });
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain(token);
    expect(JSON.stringify(logs)).not.toContain(token);
  });

  it("rejects a malformed authorization header", async () => {
    const { app } = createTestApp();
    const response = await app.request(PROGRESS_API_PATH, {
      headers: {
        authorization: `Basic ${VALID_TOKEN}`
      }
    });
    expect(response.status).toBe(401);
  });
});

describe("progress", () => {
  it("returns empty progress for a new user", async () => {
    const { app } = createTestApp();
    const response = await app.request(PROGRESS_API_PATH, { headers: authorized() });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      progress: {}
    });
  });

  it("merges with stored progress: most attempts, earliest pass", async () => {
    const { app } = createTestApp();
    await app.request(
      PROGRESS_API_PATH,
      put({
        body: JSON.stringify({
          progress: {
            [KNOWN_LESSON]: {
              attempts: 5,
              passedAt: LATE
            }
          }
        })
      })
    );
    const response = await app.request(
      PROGRESS_API_PATH,
      put({
        body: JSON.stringify({
          progress: {
            [KNOWN_LESSON]: {
              attempts: 2,
              passedAt: EARLY
            },
            [OTHER_LESSON]: {
              attempts: 1,
              passedAt: null
            }
          }
        })
      })
    );
    const expected = {
      progress: {
        [KNOWN_LESSON]: {
          attempts: 5,
          passedAt: EARLY
        },
        [OTHER_LESSON]: {
          attempts: 1,
          passedAt: null
        }
      }
    };
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expected);
    const stored = await app.request(PROGRESS_API_PATH, { headers: authorized() });
    expect(await stored.json()).toEqual(expected);
    const otherUser = await app.request(PROGRESS_API_PATH, { headers: authorized(OTHER_TOKEN) });
    expect(await otherUser.json()).toEqual({
      progress: {}
    });
  });

  it("rejects a lesson id that is not in the index", async () => {
    const { app } = createTestApp();
    const response = await app.request(
      PROGRESS_API_PATH,
      put({
        body: JSON.stringify({
          progress: {
            "support/99-not-a-lesson": {
              attempts: 1,
              passedAt: null
            }
          }
        })
      })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "unknown_lessons",
      ids: ["support/99-not-a-lesson"]
    });
  });

  it("rejects invalid JSON", async () => {
    const { app } = createTestApp();
    const response = await app.request(PROGRESS_API_PATH, put({ body: "{not json" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_body" });
  });

  it("rejects a wrong shape with issue paths only", async () => {
    const { app } = createTestApp();
    const response = await app.request(
      PROGRESS_API_PATH,
      put({
        body: JSON.stringify({
          progress: {
            [KNOWN_LESSON]: {
              attempts: -1,
              passedAt: "yesterday"
            }
          }
        })
      })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      error: "invalid_body",
      issues: [{ path: ["progress", KNOWN_LESSON, "attempts"] }, { path: ["progress", KNOWN_LESSON, "passedAt"] }]
    });
  });

  it("rejects an oversize body with 413", async () => {
    const { app } = createTestApp();
    const response = await app.request(PROGRESS_API_PATH, put({ body: "x".repeat(MAX_BODY_BYTES + 1) }));
    expect(response.status).toBe(413);
  });

  it("answers other methods with 405", async () => {
    const { app } = createTestApp();
    const response = await app.request(PROGRESS_API_PATH, {
      method: "DELETE",
      headers: authorized()
    });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, PUT");
  });

  it("returns JSON 404 for unknown API paths", async () => {
    const { app } = createTestApp();
    const response = await app.request("/api/nothing", { headers: authorized() });
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

describe("rate limit", () => {
  it("returns 429 once a user's bucket is empty, per user", async () => {
    let now = 0;
    const { app } = createTestApp({
      capacity: 2,
      refillPerSecond: 1,
      now: () => now
    });
    const statuses: number[] = [];
    for (let iRequest = 0; iRequest < 3; iRequest++) {
      statuses.push((await app.request(PROGRESS_API_PATH, { headers: authorized() })).status);
    }
    expect(statuses).toEqual([200, 200, 429]);
    expect((await app.request(PROGRESS_API_PATH, { headers: authorized(OTHER_TOKEN) })).status).toBe(200);
    now = 1000;
    expect((await app.request(PROGRESS_API_PATH, { headers: authorized() })).status).toBe(200);
  });
});
