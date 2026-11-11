import {
  createRestClient,
  type FetchLike,
  HTTP_STATUS,
  HttpError,
  operationSchema,
  waitForOperation
} from "#scripts/lib/firebase-rest.ts";
import { z } from "#scripts/lib/zod.ts";
import { describe, expect, it } from "vitest";

const API_ROOT = "https://firebase.googleapis.com/v1beta1";
const OPERATION_NAME = "operations/workflows/abc";
const ATTEMPTS = 5;

function jsonResponse({ status = HTTP_STATUS.ok, body }: {
  status?: number;
  body: unknown;
}) {
  return new Response(JSON.stringify(body), { status });
}

function fakeFetch(responses: Response[]) {
  const calls: string[] = [];
  async function fetchImpl(url: string) {
    calls.push(url);
    const next = responses.shift();
    if (!next) {
      throw new Error("no more fake responses");
    }

    return next;
  }

  return {
    calls,
    fetchImpl
  };
}

function clientWith(fetchImpl: FetchLike) {
  return createRestClient({
    accessToken: "token",
    quotaProject: "project",
    fetchImpl
  });
}

async function noWait() {}

describe("waitForOperation", () => {
  it("polls until the operation is done", async () => {
    const { calls, fetchImpl } = fakeFetch([
      jsonResponse({
        body: {
          name: OPERATION_NAME
        }
      }),
      jsonResponse({
        body: {
          name: OPERATION_NAME,
          done: true,
          response: {
            appId: "1:2:web:3"
          }
        }
      })
    ]);
    const finished = await waitForOperation({
      request: clientWith(fetchImpl),
      apiRoot: API_ROOT,
      operation: {
        name: OPERATION_NAME
      },
      attempts: ATTEMPTS,
      wait: noWait
    });
    expect(finished.done).toBe(true);
    expect(calls).toEqual([`${API_ROOT}/${OPERATION_NAME}`, `${API_ROOT}/${OPERATION_NAME}`]);
  });

  it("returns at once when the operation is already done", async () => {
    const { calls, fetchImpl } = fakeFetch([]);
    await waitForOperation({
      request: clientWith(fetchImpl),
      apiRoot: API_ROOT,
      operation: {
        name: OPERATION_NAME,
        done: true
      },
      wait: noWait
    });
    expect(calls).toHaveLength(0);
  });

  it("throws the operation's error", async () => {
    const { fetchImpl } = fakeFetch([
      jsonResponse({
        body: {
          name: OPERATION_NAME,
          done: true,
          error: {
            code: 7,
            message: "denied"
          }
        }
      })
    ]);
    await expect(
      waitForOperation({
        request: clientWith(fetchImpl),
        apiRoot: API_ROOT,
        operation: {
          name: OPERATION_NAME
        },
        wait: noWait
      })
    ).rejects.toThrow("denied");
  });

  it("gives up after the attempt limit", async () => {
    const pending = Array.from({ length: ATTEMPTS }, () => jsonResponse({
      body: {
        name: OPERATION_NAME
      }
    }));
    const { calls, fetchImpl } = fakeFetch(pending);
    await expect(
      waitForOperation({
        request: clientWith(fetchImpl),
        apiRoot: API_ROOT,
        operation: {
          name: OPERATION_NAME
        },
        attempts: ATTEMPTS,
        wait: noWait
      })
    ).rejects.toThrow(`after ${ATTEMPTS} checks`);
    expect(calls).toHaveLength(ATTEMPTS - 1);
  });
});

describe("createRestClient", () => {
  it("turns an API error into an HttpError with status and message", async () => {
    const { fetchImpl } = fakeFetch([
      jsonResponse({
        status: HTTP_STATUS.forbidden,
        body: {
          error: {
            code: HTTP_STATUS.forbidden,
            status: "PERMISSION_DENIED",
            message: "no access"
          }
        }
      })
    ]);
    const failure = await clientWith(fetchImpl)({
      method: "GET",
      url: API_ROOT,
      schema: operationSchema
    }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(HttpError);
    expect(String(failure)).toContain("HTTP 403 PERMISSION_DENIED: no access");
  });

  it("rejects a response of the wrong shape", async () => {
    const { fetchImpl } = fakeFetch([jsonResponse({
      body: {
        unexpected: true
      }
    })]);
    await expect(
      clientWith(fetchImpl)({
        method: "GET",
        url: API_ROOT,
        schema: z.object({ name: z.string() })
      })
    ).rejects.toThrow("unexpected shape");
  });
});
