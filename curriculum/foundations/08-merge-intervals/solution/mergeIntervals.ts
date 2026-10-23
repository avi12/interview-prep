export function mergeIntervals(intervals: number[][]) {
  const sorted = [...intervals].sort(([startA], [startB]) => startA - startB);
  const merged: number[][] = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    if (last === undefined || start > last[1]) {
      merged.push([start, end]);
      continue;
    }

    last[1] = Math.max(last[1], end);
  }
  return merged;
}
