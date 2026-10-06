import { describe, expect, it } from "vitest";
import {
  CzkAmount,
  czkToSats,
  formatCzk,
  type KeypadKey,
  keypadAmount,
  pressKeypadKey,
} from "./money";

const max = CzkAmount.make(1_000_000);
const type = (keys: ReadonlyArray<KeypadKey>) =>
  keys.reduce((input, key) => pressKeypadKey(input, key, max), "");

describe("keypad", () => {
  it.each<[ReadonlyArray<KeypadKey>, string, number]>([
    [["1", "2", "5"], "125", 12500],
    [["1", "2", ",", "5"], "12,5", 1250],
    [["1", ",", "2", "5", "9"], "1,25", 125],
    [[",", "5"], "0,5", 50],
    [["0", "0", "7"], "7", 700],
    [["1", ",", ",", "2"], "1,2", 120],
    [["1", "2", "backspace"], "1", 100],
    [["1", ",", "backspace"], "1", 100],
    [["backspace"], "", 0],
    [["1", "0", "0", "0", "0", "1"], "10000", 1_000_000],
  ])("%j gives %s", (keys, input, amount) => {
    expect(type(keys)).toBe(input);
    expect(keypadAmount(type(keys))).toBe(amount);
  });
});

describe("formatCzk", () => {
  it.each<[number, "cs" | "en", string]>([
    [123450, "cs", "1 234,50 Kč"],
    [12000, "cs", "120 Kč"],
    [123450, "en", "CZK 1,234.50"],
    [12000, "en", "CZK 120"],
  ])("formats %d in %s", (amount, language, expected) => {
    expect(formatCzk(CzkAmount.make(amount), language)).toBe(expected);
  });
});

describe("czkToSats", () => {
  it("converts exactly when the amount divides evenly", () => {
    expect(czkToSats(CzkAmount.make(100_000), 2_000_000)).toBe(50_000);
  });

  it("rounds up to whole sats", () => {
    expect(czkToSats(CzkAmount.make(100), 2_345_678.9)).toBe(43);
    expect(czkToSats(CzkAmount.make(1), 2_000_000)).toBe(1);
  });

  it("returns zero for a zero amount", () => {
    expect(czkToSats(CzkAmount.make(0), 2_000_000)).toBe(0);
  });
});
