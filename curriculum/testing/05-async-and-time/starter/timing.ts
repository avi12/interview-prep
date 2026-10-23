export async function retry<T>(_options: {
  task: () => Promise<T>;
  attempts: number;
  delayMs: number;
}): Promise<T> {
  throw new Error("not implemented");
}

export function isExpired(_options: {
  issuedAt: number;
  ttlMs: number;
  now?: () => number;
}) {
  return false;
}
