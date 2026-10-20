export function hasDuplicate(numbers: number[]) {
  const seen = new Set<number>();
  for (const value of numbers) {
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false;
}
