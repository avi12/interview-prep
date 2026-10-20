export function countWords(words: string[]) {
  const countByWord = new Map<string, number>();
  for (const word of words) {
    countByWord.set(word, (countByWord.get(word) ?? 0) + 1);
  }
  return countByWord;
}
