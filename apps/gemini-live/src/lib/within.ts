export function within<T, TFallback>({ timeoutMs, promise, fallback }: {
  timeoutMs: number;
  promise: Promise<T>;
  fallback: TFallback;
}) {
  return new Promise<T | TFallback>(resolve => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}
