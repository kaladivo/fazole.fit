import { describe, expect, it } from "vitest";
import { checkAccount, formatIban, looksComplete } from "./shopForm";

describe("checkAccount", () => {
  it("names the bank and the IBAN of a valid account", () => {
    expect(checkAccount("19-2000145399/0800")).toMatchObject({
      ok: true,
      bank: "Česká spořitelna, a.s.",
      iban: "CZ65 0800 0000 1920 0014 5399",
    });
  });

  it("maps each core error to its message", () => {
    expect(checkAccount("123")).toEqual({
      ok: false,
      error: "bankAccountInvalidFormat",
    });
    expect(checkAccount("19-2000145398/0800")).toEqual({
      ok: false,
      error: "bankAccountInvalidChecksum",
    });
    expect(checkAccount("19-2000145399/0001")).toEqual({
      ok: false,
      error: "bankAccountUnknownBank",
    });
  });
});

describe("formatIban", () => {
  it("groups by four", () => {
    expect(formatIban("CZ6508000000192000145399")).toBe(
      "CZ65 0800 0000 1920 0014 5399",
    );
  });
});

describe("looksComplete", () => {
  it("waits for the four-digit bank code", () => {
    expect(looksComplete("123456789/080")).toBe(false);
    expect(looksComplete("123456789 / 0800 ")).toBe(true);
  });
});
