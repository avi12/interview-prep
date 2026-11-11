import { PyReply, type PyRunRequest, pyRunResponseSchema } from "@/runner/py/protocol.ts";
import { ChannelEnd, request } from "@/runner/worker-channel.ts";

let warmWorker: Worker | undefined;
let queue: Promise<unknown> = Promise.resolve();

function workerOf() {
  warmWorker ??= new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  return warmWorker;
}

function discardWorker() {
  warmWorker?.terminate();
  warmWorker = undefined;
}

async function runNow({ message, signal, timeoutMs }: {
  message: PyRunRequest;
  signal: AbortSignal;
  timeoutMs: number;
}) {
  const outcome = await request({
    worker: workerOf(),
    message,
    schema: pyRunResponseSchema,
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
  });
  const isWorkerSpent = outcome.end !== ChannelEnd.done || outcome.response.kind === PyReply.crash;
  if (isWorkerSpent) {
    discardWorker();
  }

  return outcome;
}

export function runPyLesson(input: {
  message: PyRunRequest;
  signal: AbortSignal;
  timeoutMs: number;
}) {
  const outcome = queue.then(() => runNow(input));
  queue = outcome.catch(() => undefined);
  return outcome;
}
