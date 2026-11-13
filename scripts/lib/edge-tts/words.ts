export function createWordLocator({ text, iStart = 0 }: { text: string; iStart?: number }) {
  let iCursor = iStart;
  return (word: string) => {
    const iWord = text.indexOf(word, iCursor);
    if (iWord < 0) {
      return null;
    }

    iCursor = iWord + word.length;
    return iWord;
  };
}
