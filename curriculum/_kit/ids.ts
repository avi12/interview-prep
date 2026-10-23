export function sequentialIds(prefix: string) {
  let count = 0;
  return () => `${prefix}-${++count}`;
}
