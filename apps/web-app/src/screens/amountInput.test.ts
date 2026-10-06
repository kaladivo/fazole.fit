import { describe, expect, it } from "vitest";
import type { KeypadKey } from "@platitprosim/ui";
import { applyAmountKey, formatAmount } from "./amountInput";

const type = (keys: readonly KeypadKey[]) => keys.reduce(applyAmountKey, "");

describe("applyAmountKey", () => {
  it("builds crowns and up to two haléře digits", () => {
    expect(type(["1", "2", "decimal", "5", "0", "9"])).toBe("12,50");
  });

  it("starts a bare comma with a zero and allows one comma", () => {
    expect(type(["decimal", "decimal", "5"])).toBe("0,5");
  });

  it("drops leading zeros and caps whole crowns at seven digits", () => {
    expect(type(["0", "0", "7"])).toBe("7");
    expect(type(Array.from({ length: 9 }, (): KeypadKey => "9"))).toBe(
      "9999999",
    );
  });

  it("deletes the last character", () => {
    expect(type(["4", "2", "backspace"])).toBe("4");
  });
});

describe("formatAmount", () => {
  it("groups thousands with no-break spaces", () => {
    expect(formatAmount("1234567,5")).toBe("1 234 567,5");
    expect(formatAmount("")).toBe("0");
  });
});
