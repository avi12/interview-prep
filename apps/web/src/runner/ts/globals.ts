import { withBase64Url } from "@/runner/ts/node/buffer.ts";
import { createProcess } from "@/runner/ts/node/process.ts";
import { setSafeTimers } from "@vitest/utils";

type ImmediateCallback = (...args: unknown[]) => void;

function immediates() {
  const channel = new MessageChannel();
  const queue = new Map<number, () => void>();
  let nextId = 0;
  channel.port1.onmessage = e => {
    const run = queue.get(e.data);
    queue.delete(e.data);
    run?.();
  };
  return {
    setImmediate(callback: ImmediateCallback, ...args: unknown[]) {
      nextId++;
      queue.set(nextId, () => callback(...args));
      channel.port2.postMessage(nextId);
      return nextId;
    },
    clearImmediate: (id: number) => queue.delete(id)
  };
}

export function installGlobals() {
  Object.assign(globalThis, {
    global: globalThis,
    Buffer: withBase64Url(),
    process: createProcess(),
    ...immediates()
  });
  setSafeTimers();
}
