import {
  type LessonProgress,
  mergeProgress,
  type Progress,
  PROGRESS_API_PATH,
  progressResponseSchema,
  progressUpdateSchema,
  syncedProgressSchema
} from "#scripts/lib/progress-sync.ts";
import { readStored, writeStored } from "@/lib/browser-storage.ts";

export interface ProgressStore {
  load(): Promise<Progress>;
  save(progress: Progress): Promise<Progress>;
}

export const LOCAL_PROGRESS_KEY = "interview-prep.progress";

const HttpStatus = {
  UNAUTHORIZED: 401
} as const;

const HttpMethod = {
  GET: "GET",
  PUT: "PUT"
} as const;

type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

export const SyncFailure = {
  UNAUTHORIZED: "unauthorized",
  REJECTED: "rejected",
  MALFORMED: "malformed",
  INVALID: "invalid"
} as const;

export type SyncFailure = (typeof SyncFailure)[keyof typeof SyncFailure];

export class ProgressSyncError extends Error {
  readonly failure: SyncFailure;

  constructor(failure: SyncFailure) {
    super(`Progress sync failed: ${failure}`);
    this.failure = failure;
  }
}

export function createLocalProgressStore(storage: Storage | null) {
  return {
    load: async () =>
      readStored({
        storage,
        key: LOCAL_PROGRESS_KEY,
        schema: syncedProgressSchema,
        fallback: {}
      }),
    async save(progress) {
      writeStored({
        storage,
        key: LOCAL_PROGRESS_KEY,
        value: progress
      });
      return progress;
    }
  } satisfies ProgressStore;
}

export function passTimestamp() {
  return new Date().toISOString();
}

export type IdToken = (isForcedRefresh: boolean) => Promise<string>;

async function parsedProgress(response: Response) {
  const body: unknown = await response.json().catch(() => undefined);
  const parsed = progressResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ProgressSyncError(SyncFailure.MALFORMED);
  }

  return parsed.data.progress;
}

function requestBody(progress: Progress | undefined) {
  if (!progress) {
    return undefined;
  }

  const update = progressUpdateSchema.safeParse({ progress });
  if (!update.success) {
    throw new ProgressSyncError(SyncFailure.INVALID);
  }

  return JSON.stringify(update.data);
}

export function createRemoteProgressStore({ fetchJson, idToken }: { fetchJson: typeof fetch; idToken: IdToken }) {
  async function send({
    method,
    body,
    isForcedRefresh
  }: {
    method: HttpMethod;
    body: string | undefined;
    isForcedRefresh: boolean;
  }) {
    const token = await idToken(isForcedRefresh);
    return fetchJson(PROGRESS_API_PATH, {
      method,
      body,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {})
      }
    });
  }

  async function request({ method, progress }: { method: HttpMethod; progress?: Progress }) {
    const body = requestBody(progress);
    const first = await send({
      method,
      body,
      isForcedRefresh: false
    });
    const response =
      first.status === HttpStatus.UNAUTHORIZED
        ? await send({
            method,
            body,
            isForcedRefresh: true
          })
        : first;
    if (response.status === HttpStatus.UNAUTHORIZED) {
      throw new ProgressSyncError(SyncFailure.UNAUTHORIZED);
    }

    if (!response.ok) {
      throw new ProgressSyncError(SyncFailure.REJECTED);
    }

    return parsedProgress(response);
  }

  return {
    load: () => request({ method: HttpMethod.GET }),
    save: progress =>
      request({
        method: HttpMethod.PUT,
        progress
      })
  } satisfies ProgressStore;
}

function isSameLesson({ left, right }: { left: LessonProgress | undefined; right: LessonProgress | undefined }) {
  return left?.attempts === right?.attempts && left?.passedAt === right?.passedAt;
}

function isSameProgress({ left, right }: { left: Progress; right: Progress }) {
  const ids = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const id of ids) {
    if (
      !isSameLesson({
        left: left[id],
        right: right[id]
      })
    ) {
      return false;
    }
  }
  return true;
}

export async function syncLocalIntoAccount({ local, account }: { local: ProgressStore; account: ProgressStore }) {
  const [localProgress, accountProgress] = await Promise.all([local.load(), account.load()]);
  const merged = mergeProgress({
    left: accountProgress,
    right: localProgress
  });
  if (
    isSameProgress({
      left: merged,
      right: accountProgress
    })
  ) {
    return accountProgress;
  }

  return account.save(localProgress);
}
