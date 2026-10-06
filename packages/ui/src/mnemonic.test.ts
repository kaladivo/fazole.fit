import { describe, expect, it } from "vitest";
import { fillWords } from "./mnemonic-words";

const empty = Array.from({ length: 12 }, () => "");

describe("fillWords", () => {
  it("sets the typed word in its cell", () => {
    expect(fillWords(empty, 2, " Abandon ")[2]).toBe("abandon");
  });

  it("spreads a pasted phrase over the cells from the pasted one on", () => {
    const words = fillWords(["keep", ...empty.slice(1)], 1, "a b\nc");
    expect(words.slice(0, 5)).toEqual(["keep", "a", "b", "c", ""]);
  });

  it("drops pasted words that do not fit", () => {
    const words = fillWords(empty, 11, "last extra");
    expect(words).toHaveLength(12);
    expect(words[11]).toBe("last");
  });
});
