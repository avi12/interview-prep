export async function retry<T>({ task, attempts, delayMs }: { task: () => Promise<T>; attempts: number; delayMs: number }): Promise<T> {
  throw new Error("not implemented");
}

export function isExpired({ issuedAt, ttlMs, now }: { issuedAt: number; ttlMs: number; now?: () => number }) {
  return false;
}
