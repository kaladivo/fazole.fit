import type { KeypadKey } from "@platitprosim/ui";
import { describe, expect, it } from "vitest";
import {
  canRequestPayment,
  formatAmountInput,
  MAX_AMOUNT,
  pressAmountKey,
} from "./amountInput";

const type = (keys: readonly KeypadKey[]) => keys.reduce(pressAmountKey, "");

describe("pressAmountKey", () => {
  it("builds crowns and up to two haléře digits", () => {
    expect(type(["1", "2", "decimal", "5", "0", "9"])).toBe("12,50");
  });

  it("starts a bare comma with a zero and allows one comma", () => {
    expect(type(["decimal", "decimal", "5"])).toBe("0,5");
  });

  it("drops leading zeros and deletes the last character", () => {
    expect(type(["0", "0", "7"])).toBe("7");
    expect(type(["4", "2", "backspace"])).toBe("4");
  });

  it("stops at 1 000 000 Kč", () => {
    expect(MAX_AMOUNT).toBe(100_000_000);
    const million: KeypadKey[] = ["1", "0", "0", "0", "0", "0", "0"];
    expect(type([...million, "0"])).toBe("1000000");
    expect(type([...million, "decimal", "0", "1"])).toBe("1000000,0");
    expect(type(["9", "9", "9", "9", "9", "9", "decimal", "9", "9"])).toBe(
      "999999,99",
    );
  });
});

describe("canRequestPayment", () => {
  it("needs an amount above zero", () => {
    expect(canRequestPayment("")).toBe(false);
    expect(canRequestPayment("0,")).toBe(false);
    expect(canRequestPayment("0,01")).toBe(true);
  });
});

describe("formatAmountInput", () => {
  it("groups thousands with the language's separators", () => {
    expect(formatAmountInput("1234567,5", "cs")).toBe("1 234 567,5");
    expect(formatAmountInput("1234567,", "en")).toBe("1,234,567.");
    expect(formatAmountInput("", "cs")).toBe("0");
  });
});
