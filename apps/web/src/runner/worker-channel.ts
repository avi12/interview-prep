import type { z } from "@/lib/zod.ts";

export const ChannelEnd = {
  done: "done",
  crashed: "crashed",
  aborted: "aborted"
} as const;

export type ChannelOutcome<Response> =
  | {
    end: typeof ChannelEnd.done;
    response: Response;
  }
  | {
    end: typeof ChannelEnd.crashed;
    message: string;
  }
  | {
    end: typeof ChannelEnd.aborted;
    reason: unknown;
  };

const WORKER_START_FAILED = "The test worker failed to start";

export type WorkerScope = {
  location: { href: string };
  postMessage: (message: unknown) => void;
  addEventListener: (type: "message", listener: (e: MessageEvent<unknown>) => void) => void;
};

export const workerScope: WorkerScope = globalThis;

export function request<Schema extends z.ZodType>({ worker, message, schema, signal }: {
  worker: Worker;
  message: unknown;
  schema: Schema;
  signal: AbortSignal;
}) {
  return new Promise<ChannelOutcome<z.output<Schema>>>(resolve => {
    function finish(outcome: ChannelOutcome<z.output<Schema>>) {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
      resolve(outcome);
    }

    function onMessage(e: MessageEvent<unknown>) {
      const parsed = schema.safeParse(e.data);
      finish(
        parsed.success ? {
          end: ChannelEnd.done,
          response: parsed.data
        } : {
          end: ChannelEnd.crashed,
          message: `Unexpected message from the test worker: ${parsed.error.message}`
        }
      );
    }

    function onError(e: ErrorEvent) {
      e.preventDefault();
      finish({
        end: ChannelEnd.crashed,
        message: e.message || WORKER_START_FAILED
      });
    }

    function onAbort() {
      finish({
        end: ChannelEnd.aborted,
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
