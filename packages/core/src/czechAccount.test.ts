import { Either } from "effect";
import { describe, expect, it } from "vitest";
import {
  czechAccountToIban,
  formatCzechAccount,
  ibanToCzechAccount,
  parseCzechAccount,
} from "./czechAccount";

const reasonOf = (result: ReturnType<typeof parseCzechAccount>) =>
  Either.isLeft(result) ? result.left.reason : null;

describe("parseCzechAccount", () => {
  it.each([
    ["19-2000145399/0800", "CZ6508000000192000145399"],
    ["1265098001/5500", "CZ5855000000001265098001"],
    [" 19 - 2000 145 399 / 0800 ", "CZ6508000000192000145399"],
    ["000019-2000145399/0800", "CZ6508000000192000145399"],
  ])("converts %s to IBAN", (input, iban) => {
    const account = Either.getOrThrow(parseCzechAccount(input));
    expect(czechAccountToIban(account)).toBe(iban);
  });

  it.each([
    ["", "invalidFormat"],
    ["2000145399", "invalidFormat"],
    ["1234567-2000145399/0800", "invalidFormat"],
    ["12345678901/0800", "invalidFormat"],
    ["2000145399/800", "invalidFormat"],
    ["0000000001/0800", "invalidFormat"],
    ["19-2000145398/0800", "invalidChecksum"],
    ["18-2000145399/0800", "invalidChecksum"],
    ["19-2000145399/0801", "unknownBank"],
  ])("rejects %s as %s", (input, reason) => {
    expect(reasonOf(parseCzechAccount(input))).toBe(reason);
  });
});

describe("ibanToCzechAccount", () => {
  it("round-trips an account", () => {
    const account = Either.getOrThrow(
      ibanToCzechAccount("cz65 0800 0000 1920 0014 5399"),
    );
    expect(account).toEqual({
      prefix: "000019",
      number: "2000145399",
      bankCode: "0800",
    });
    expect(formatCzechAccount(account)).toBe("19-2000145399/0800");
  });

  it.each([
    ["SK3112000000198742637541", "invalidFormat"],
    ["CZ6608000000192000145399", "invalidChecksum"],
  ])("rejects %s as %s", (iban, reason) => {
    expect(reasonOf(ibanToCzechAccount(iban))).toBe(reason);
  });
});

describe("formatCzechAccount", () => {
  it("omits an empty prefix", () => {
    const account = Either.getOrThrow(parseCzechAccount("1265098001/5500"));
    expect(formatCzechAccount(account)).toBe("1265098001/5500");
  });
});
