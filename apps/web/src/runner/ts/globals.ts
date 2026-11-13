import { setSafeTimers } from "@vitest/utils";

import { withBase64Url } from "@/runner/ts/node/buffer.ts";
import { createProcess } from "@/runner/ts/node/process.ts";

type ImmediateCallback = (...args: unknown[]) => void;

function immediates() {
  const channel = new MessageChannel();
  const queue = new Map<number, () => void>();
  let nextId = 0;
  channel.port1.onmessage = event => {
    const run = queue.get(event.data);
    queue.delete(event.data);
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
