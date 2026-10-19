export const within = <T, F>({ ms, promise, fallback }: { ms: number; promise: Promise<T>; fallback: F }) =>
  new Promise<T | F>(resolve => {
    const timer = setTimeout(() => resolve(fallback), ms);
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
