export const measureMs = <T>(run: () => T) => {
  const startedAt = performance.now();
  const result = run();
  return { result, elapsedMs: performance.now() - startedAt };
};
