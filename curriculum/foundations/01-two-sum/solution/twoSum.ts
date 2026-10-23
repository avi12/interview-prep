export function twoSum(numbers: number[], target: number) {
  const indexByValue = new Map<number, number>();
  for (const [i, value] of numbers.entries()) {
    const partnerIndex = indexByValue.get(target - value);
    if (partnerIndex !== undefined) {
      return [partnerIndex, i];
    }

    indexByValue.set(value, i);
  }
  return [];
}
