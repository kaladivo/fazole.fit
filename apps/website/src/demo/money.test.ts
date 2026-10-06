import { describe, expect, it } from "vitest";
import {
  formatCzk,
  formatTyped,
  halereToSats,
  pressKey,
  typedHalere,
} from "./money";
import { demoSpd } from "./qr";

const type = (keys: Parameters<typeof pressKey>[1][]) =>
  keys.reduce(pressKey, "");

describe("demo money", () => {
  it("types whole crowns, a comma and at most two haléře digits", () => {
    expect(type(["1", "2", "decimal", "5", "0", "9"])).toBe("12,50");
    expect(type(["decimal", "5"])).toBe("0,5");
    expect(type(["0", "7", "backspace"])).toBe("");
    expect(typedHalere("12,5")).toBe(1250);
  });

  it("formats amounts the Czech and the English way", () => {
    expect(formatTyped("1250,5", "cs")).toBe("1 250,5");
    expect(formatTyped("1250,5", "en")).toBe("1,250.5");
    expect(formatCzk(125_000, "cs")).toBe("1 250 Kč");
    expect(formatCzk(125_050, "en")).toBe("CZK 1,250.50");
  });

  it("rounds sats up at the demo rate", () => {
    expect(halereToSats(125_000)).toBe(62_500);
    expect(halereToSats(1)).toBe(1);
  });

  it("builds an SPD string for an account no bank owns", () => {
    expect(demoSpd(125_050, "1234567890")).toBe(
      "SPD*1.0*ACC:CZ0000000000000123456789*AM:1250.50*CC:CZK*X-VS:1234567890*MSG:DEMO - NEPLATIT",
    );
  });
});
