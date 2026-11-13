import { setTimeout as sleep } from "node:timers/promises";

import { zod } from "#scripts/lib/zod.ts";

export const API = {
  FIREBASE: "https://firebase.googleapis.com/v1beta1",
  HOSTING: "https://firebasehosting.googleapis.com/v1beta1",
  RULES: "https://firebaserules.googleapis.com/v1",
  IDENTITY_TOOLKIT: "https://identitytoolkit.googleapis.com/v2"
} as const;

export const HTTP_METHOD = {
  GET: "GET",
  POST: "POST",
  PATCH: "PATCH"
} as const;

type HttpMethod = (typeof HTTP_METHOD)[keyof typeof HTTP_METHOD];

export const HTTP_STATUS = {
  OK: 200,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409
} as const;

const OPERATION_ATTEMPTS = 60;
const OPERATION_DELAY_MS = 5000;
const MAX_LOGGED_BODY_CHARS = 400;

const apiErrorSchema = zod.object({
  error: zod.object({
    code: zod.number().optional(),
    message: zod.string().optional(),
    status: zod.string().optional()
  })
});

export const operationSchema = zod.object({
  name: zod.string(),
  done: zod.boolean().optional(),
  error: zod
    .object({
      code: zod.number().optional(),
      message: zod.string().optional()
    })
    .optional(),
  response: zod.unknown().optional()
});

type Operation = zod.infer<typeof operationSchema>;

export interface RequestSpec {
  method: HttpMethod;
  url: string;
  body?: unknown;
}

type RestOptions<Schema extends zod.ZodType> = RequestSpec & { schema: Schema };

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export class HttpError extends Error {
  readonly status: number;
  readonly apiStatus: string;

  constructor({
    spec,
    status,
    apiStatus,
    apiMessage
  }: {
    spec: RequestSpec;
    status: number;
    apiStatus: string;
    apiMessage: string;
  }) {
    super(`${spec.method} ${spec.url} -> HTTP ${status} ${apiStatus}: ${apiMessage}`);
    this.status = status;
    this.apiStatus = apiStatus;
  }
}

export function isHttpStatus({ error, statuses }: { error: unknown; statuses: number[] }) {
  return error instanceof HttpError && statuses.includes(error.status);
}

export function describeRequest(spec: RequestSpec) {
  const line = `${spec.method} ${spec.url}`;
  if (spec.body === undefined) {
    return line;
  }

  const body = JSON.stringify(spec.body);
  const shownBody = body.length > MAX_LOGGED_BODY_CHARS ? `${body.slice(0, MAX_LOGGED_BODY_CHARS)}...` : body;
  return `${line} ${shownBody}`;
}

function parseJsonText(text: string) {
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: {
        message: text.slice(0, MAX_LOGGED_BODY_CHARS)
      }
    };
  }
}

function toHttpError({ spec, status, payload }: { spec: RequestSpec; status: number; payload: unknown }) {
  const parsed = apiErrorSchema.safeParse(payload);
  return new HttpError({
    spec,
    status,
    apiStatus: parsed.success ? (parsed.data.error.status ?? "") : "",
    apiMessage: parsed.success ? (parsed.data.error.message ?? "") : "no error message"
  });
}

export function createRestClient({
  accessToken,
  quotaProject,
  fetchImpl = fetch
}: {
  accessToken: string;
  quotaProject: string;
  fetchImpl?: FetchLike;
}) {
  return async function request<Schema extends zod.ZodType>({ schema, ...spec }: RestOptions<Schema>) {
    const response = await fetchImpl(spec.url, {
      method: spec.method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        "x-goog-user-project": quotaProject
      },
      body: spec.body === undefined ? undefined : JSON.stringify(spec.body)
    });
    const payload = parseJsonText(await response.text());
    if (!response.ok) {
      throw toHttpError({
        spec,
        status: response.status,
        payload
      });
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`${spec.method} ${spec.url} returned an unexpected shape: ${parsed.error.message}`);
    }

    return parsed.data;
  };
}

export type RestRequest = ReturnType<typeof createRestClient>;

export function withRequestLog(request: RestRequest) {
  return function loggedRequest<Schema extends zod.ZodType>(options: RestOptions<Schema>) {
    console.log(`  > ${describeRequest(options)}`);
    return request(options);
  };
}

export async function findResource<Schema extends zod.ZodType>({
  request,
  url,
  schema
}: {
  request: RestRequest;
  url: string;
  schema: Schema;
}) {
  try {
    return await request({
      method: HTTP_METHOD.GET,
      url,
      schema
    });
  } catch (error) {
    if (
      isHttpStatus({
        error,
        statuses: [HTTP_STATUS.NOT_FOUND]
      })
    ) {
      return null;
    }

    throw error;
  }
}

export async function retryUntil<Result>({
  attempts,
  delayMs,
  attempt,
  wait = sleep
}: {
  attempts: number;
  delayMs: number;
  attempt: (iAttempt: number) => Promise<Result | undefined>;
  wait?: (delayMs: number) => Promise<unknown>;
}) {
  for (let iAttempt = 0; iAttempt < attempts; iAttempt++) {
    if (iAttempt > 0) {
      await wait(delayMs);
    }

    const result = await attempt(iAttempt);
    if (result !== undefined) {
      return result;
    }
  }

  return undefined;
}

export async function waitForOperation({
  request,
  apiRoot,
  operation,
  attempts = OPERATION_ATTEMPTS,
  delayMs = OPERATION_DELAY_MS,
  wait = sleep
}: {
  request: RestRequest;
  apiRoot: string;
  operation: Operation;
  attempts?: number;
  delayMs?: number;
  wait?: (delayMs: number) => Promise<unknown>;
}) {
  const finished = await retryUntil({
    attempts,
    delayMs,
    wait,
    async attempt(iAttempt) {
      const current =
        iAttempt === 0
          ? operation
          : await request({
              method: HTTP_METHOD.GET,
              url: `${apiRoot}/${operation.name}`,
              schema: operationSchema
            });
      return current.done ? current : undefined;
    }
  });
  if (!finished) {
    throw new Error(`Operation ${operation.name} did not finish after ${attempts} checks`);
  }

  if (finished.error) {
    throw new Error(`Operation ${operation.name} failed: ${finished.error.message ?? `code ${finished.error.code}`}`);
  }

  return finished;
}
