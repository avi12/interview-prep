export function findLargest(numbers: number[]) {
  let largest: number | null = null;
  for (const value of numbers) {
    if (largest === null || value > largest) largest = value;
  }
  return largest;
}
