export function lengthOfLongestSubstring(text: string) {
  const lastIndexByChar = new Map<string, number>();
  let windowStart = 0;
  let longest = 0;
  for (const [index, char] of Array.from(text).entries()) {
    const lastIndex = lastIndexByChar.get(char);
    if (lastIndex !== undefined) {
      windowStart = Math.max(windowStart, lastIndex + 1);
    }

    lastIndexByChar.set(char, index);
    longest = Math.max(longest, index - windowStart + 1);
  }
  return longest;
}
