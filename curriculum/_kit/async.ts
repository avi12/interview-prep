export function createGate() {
  let release: (() => void) | undefined;
  let fail: ((error: Error) => void) | undefined;
  const promise = new Promise<void>((resolve, reject) => {
    release = resolve;
    fail = reject;
  });
  return {
    promise,
    release: () => release?.(),
    fail: (message: string) => fail?.(new Error(message))
  };
}

export function nextTick() {
  return new Promise<void>(resolve => setImmediate(resolve));
}
