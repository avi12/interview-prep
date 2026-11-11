import {
  createLocalProgressStore,
  createRemoteProgressStore,
  LOCAL_PROGRESS_KEY,
  type ProgressStore,
  ProgressSyncError,
  SyncFailure,
  syncLocalIntoAccount
} from "@/lib/progress-store.ts";
import { BrokenStorage, MemoryStorage } from "@/test/memory-storage.ts";
import { type Progress, PROGRESS_API_PATH } from "#scripts/lib/progress-sync.ts";
import { describe, expect, it, vi } from "vitest";

const PASSED_AT = "2026-11-01T10:00:00.000Z";
const LATER_AT = "2026-11-02T10:00:00.000Z";
const TOKEN = "token-1";
const FRESH_TOKEN = "token-2";
const OK_STATUS = 200;
const UNAUTHORIZED_STATUS = 401;
const SERVER_ERROR_STATUS = 500;

const ACCOUNT_PROGRESS: Progress = {
  "sql/01-select": {
    attempts: 2,
    passedAt: PASSED_AT
  }
};

function jsonResponse({ status, body }: {
  status: number;
  body: unknown;
}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function fakeFetch(responses: Response[]) {
  const queue = [...responses];
  return vi.fn<typeof fetch>(async () => queue.shift() ?? jsonResponse({
    status: SERVER_ERROR_STATUS,
    body: {}
  }));
}

function fakeToken() {
  return vi.fn(async (isForcedRefresh: boolean) => isForcedRefresh ? FRESH_TOKEN : TOKEN);
}

function headerOf({ init, name }: {
  init: RequestInit | undefined;
  name: string;
}) {
  return new Headers(init?.headers).get(name);
}

function memoryStore(initial: Progress): ProgressStore & { saved: Progress[] } {
  let current = initial;
  const saved: Progress[] = [];
  return {
    saved,
    load: async () => current,
    async save(progress) {
      saved.push(progress);
      current = progress;
      return progress;
    }
  };
}

describe("local progress store", () => {
  it("round-trips progress through storage", async () => {
    const store = createLocalProgressStore(new MemoryStorage());
    await store.save(ACCOUNT_PROGRESS);
    expect(await store.load()).toEqual(ACCOUNT_PROGRESS);
  });

  it("treats corrupt or invalid data as empty", async () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_PROGRESS_KEY, "{not json");
    expect(await createLocalProgressStore(storage).load()).toEqual({});
    storage.setItem(
      LOCAL_PROGRESS_KEY, JSON.stringify({
        "../escape": {
          attempts: 1,
          passedAt: null
        }
      })
    );
    expect(await createLocalProgressStore(storage).load()).toEqual({});
  });

  it("survives blocked or missing storage", async () => {
    for (const storage of [new BrokenStorage(), null]) {
      const store = createLocalProgressStore(storage);
      expect(await store.save(ACCOUNT_PROGRESS)).toEqual(ACCOUNT_PROGRESS);
      expect(await store.load()).toEqual({});
    }
  });
});

describe("remote progress store", () => {
  it("loads with a bearer token and parses the response", async () => {
    const fetchJson = fakeFetch([jsonResponse({
      status: OK_STATUS,
      body: {
        progress: ACCOUNT_PROGRESS
      }
    })]);
    const store = createRemoteProgressStore({
      fetchJson,
      idToken: fakeToken()
    });
    expect(await store.load()).toEqual(ACCOUNT_PROGRESS);
    const [url, init] = fetchJson.mock.calls[0] ?? [];
    expect(url).toBe(PROGRESS_API_PATH);
    expect(init?.method).toBe("GET");
    expect(
      headerOf({
        init,
        name: "Authorization"
      })
    ).toBe(`Bearer ${TOKEN}`);
  });

  it("puts the progress as an update body", async () => {
    const fetchJson = fakeFetch([jsonResponse({
      status: OK_STATUS,
      body: {
        progress: ACCOUNT_PROGRESS
      }
    })]);
    const store = createRemoteProgressStore({
      fetchJson,
      idToken: fakeToken()
    });
    await store.save(ACCOUNT_PROGRESS);
    const init = fetchJson.mock.calls[0]?.[1];
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual({ progress: ACCOUNT_PROGRESS });
  });

  it("refreshes the token once after a 401", async () => {
    const fetchJson = fakeFetch([
      jsonResponse({
        status: UNAUTHORIZED_STATUS,
        body: {}
      }),
      jsonResponse({
        status: OK_STATUS,
        body: {
          progress: ACCOUNT_PROGRESS
        }
      })
    ]);
    const idToken = fakeToken();
    const store = createRemoteProgressStore({
      fetchJson,
      idToken
    });
    expect(await store.load()).toEqual(ACCOUNT_PROGRESS);
    expect(idToken.mock.calls).toEqual([[false], [true]]);
    expect(
      headerOf({
        init: fetchJson.mock.calls[1]?.[1],
        name: "Authorization"
      })
    ).toBe(`Bearer ${FRESH_TOKEN}`);
  });

  it("fails as unauthorized after a second 401", async () => {
    const fetchJson = fakeFetch([
      jsonResponse({
        status: UNAUTHORIZED_STATUS,
        body: {}
      }),
      jsonResponse({
        status: UNAUTHORIZED_STATUS,
        body: {}
      })
    ]);
    const store = createRemoteProgressStore({
      fetchJson,
      idToken: fakeToken()
    });
    await expect(store.load()).rejects.toEqual(new ProgressSyncError(SyncFailure.unauthorized));
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });

  it("rejects server errors and malformed bodies", async () => {
    const failing = createRemoteProgressStore({
      fetchJson: fakeFetch([jsonResponse({
        status: SERVER_ERROR_STATUS,
        body: {}
      })]),
      idToken: fakeToken()
    });
    await expect(failing.load()).rejects.toMatchObject({ failure: SyncFailure.rejected });
    const malformed = createRemoteProgressStore({
      fetchJson: fakeFetch([jsonResponse({
        status: OK_STATUS,
        body: {
          progress: "nope"
        }
      })]),
      idToken: fakeToken()
    });
    await expect(malformed.load()).rejects.toMatchObject({ failure: SyncFailure.malformed });
  });

  it("never sends progress that breaks the update schema", async () => {
    const fetchJson = fakeFetch([]);
    const store = createRemoteProgressStore({
      fetchJson,
      idToken: fakeToken()
    });
    await expect(
      store.save({
        "not a lesson id": {
          attempts: 1,
          passedAt: null
        }
      })
    ).rejects.toMatchObject({ failure: SyncFailure.invalid });
    expect(fetchJson).not.toHaveBeenCalled();
  });
});

describe("syncLocalIntoAccount", () => {
  it("skips the write when the account already holds the local progress", async () => {
    const account = memoryStore(ACCOUNT_PROGRESS);
    const local = memoryStore({
      "sql/01-select": {
        attempts: 1,
        passedAt: LATER_AT
      }
    });
    expect(
      await syncLocalIntoAccount({
        local,
        account
      })
    ).toEqual(ACCOUNT_PROGRESS);
    expect(account.saved).toEqual([]);
  });

  it("puts the local copy when it adds something, and leaves it intact", async () => {
    const localProgress: Progress = {
      "oop/01-classes": {
        attempts: 1,
        passedAt: LATER_AT
      }
    };
    const account = memoryStore(ACCOUNT_PROGRESS);
    const local = memoryStore(localProgress);
    await syncLocalIntoAccount({
      local,
      account
    });
    expect(account.saved).toEqual([localProgress]);
    expect(local.saved).toEqual([]);
  });
});
