import { describe, expect, it } from "vitest";
import { dictionaries, translate } from ".";
import type { I18nKey } from ".";

const placeholders = (text: string) =>
  [...text.matchAll(/\{\w+\}/gu)].map((match) => match[0]).sort();

const keys = Object.keys(dictionaries.cs).filter(
  (key): key is I18nKey => key in dictionaries.cs,
);

describe("dictionaries", () => {
  it.each(Object.entries(dictionaries))(
    "%s fills every key with the Czech placeholders",
    (_lang, dictionary) => {
      for (const key of keys) {
        expect(dictionary[key], key).not.toBe("");
        expect(placeholders(dictionary[key]), key).toEqual(
          placeholders(dictionaries.cs[key]),
        );
      }
    },
  );
});

describe("translate", () => {
  it("fills placeholders", () => {
    expect(translate("en")("walletBalanceSats", { sats: 21 })).toBe("21 sat");
  });
});
