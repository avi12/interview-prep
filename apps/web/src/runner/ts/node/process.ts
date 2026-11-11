import { VIRTUAL_ROOT } from "@/runner/virtual-root.ts";

const VIRTUAL_NODE = "/usr/local/bin/node";
const VIRTUAL_PLATFORM = "linux";
const MICROSECONDS_PER_MILLISECOND = 1000;

export function createProcess() {
  const startedAt = performance.now();
  const env: Record<string, string | undefined> = {};
  return {
    env,
    argv: [VIRTUAL_NODE],
    execPath: VIRTUAL_NODE,
    platform: VIRTUAL_PLATFORM,
    cwd: () => VIRTUAL_ROOT,
    nextTick: (callback: (...args: unknown[]) => void, ...args: unknown[]) => queueMicrotask(() => callback(...args)),
    cpuUsage: () => ({
      user: Math.round((performance.now() - startedAt) * MICROSECONDS_PER_MILLISECOND),
      system: 0
    }),
    memoryUsage: () => ({ heapUsed: 0 }),
    on: () => undefined,
    emitWarning: () => undefined,
    stdout: {
      write: () => true
    },
    stderr: {
      write: () => true
    }
  };
}
