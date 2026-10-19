export const createGate = () => {
  let release: () => void = () => {};
  let fail: (error: Error) => void = () => {};
  const promise = new Promise<void>((resolve, reject) => {
    release = resolve;
    fail = reject;
  });
  return { promise, release: () => release(), fail: (message: string) => fail(new Error(message)) };
};

export const nextTick = () => new Promise<void>(resolve => setImmediate(resolve));
