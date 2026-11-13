import type { zod } from "@/lib/zod.ts";

export const ChannelEnd = {
  DONE: "done",
  CRASHED: "crashed",
  ABORTED: "aborted"
} as const;

export type ChannelOutcome<Response> =
  | {
      end: typeof ChannelEnd.DONE;
      response: Response;
    }
  | {
      end: typeof ChannelEnd.CRASHED;
      message: string;
    }
  | {
      end: typeof ChannelEnd.ABORTED;
      reason: unknown;
    };

const WORKER_START_FAILED = "The test worker failed to start";

export interface WorkerScope {
  location: { href: string };
  postMessage: (message: unknown) => void;
  addEventListener: (type: "message", listener: (event: MessageEvent<unknown>) => void) => void;
}

export const workerScope: WorkerScope = globalThis;

export function request<Schema extends zod.ZodType>({
  worker,
  message,
  schema,
  signal
}: {
  worker: Worker;
  message: unknown;
  schema: Schema;
  signal: AbortSignal;
}) {
  return new Promise<ChannelOutcome<zod.output<Schema>>>(resolve => {
    function finish(outcome: ChannelOutcome<zod.output<Schema>>) {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
      resolve(outcome);
    }

    function onMessage(event: MessageEvent<unknown>) {
      const parsed = schema.safeParse(event.data);
      finish(
        parsed.success
          ? {
              end: ChannelEnd.DONE,
              response: parsed.data
            }
          : {
              end: ChannelEnd.CRASHED,
              message: `Unexpected message from the test worker: ${parsed.error.message}`
            }
      );
    }

    function onError(event: ErrorEvent) {
      event.preventDefault();
      finish({
        end: ChannelEnd.CRASHED,
        message: event.message || WORKER_START_FAILED
      });
    }

    function onAbort() {
      finish({
        end: ChannelEnd.ABORTED,
        reason: signal.reason
      });
    }

    if (signal.aborted) {
      onAbort();
      return;
    }

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    signal.addEventListener("abort", onAbort);
    worker.postMessage(message);
  });
}

export function errorText(error: unknown) {
  return error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
}
