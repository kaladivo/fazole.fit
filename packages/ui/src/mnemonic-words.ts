/** Spreads the words of a pasted phrase over the cells, starting at `index`. */
export const fillWords = (
  words: readonly string[],
  index: number,
  text: string,
): string[] => {
  const pasted = text.trim().toLowerCase().split(/\s+/u);
  return words.map((word, position) =>
    position < index ? word : (pasted[position - index] ?? word),
  );
};
