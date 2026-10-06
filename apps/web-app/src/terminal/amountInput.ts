import { CzkAmount, keypadAmount, pressKeypadKey } from "@platitprosim/core";
import type { KeypadInput } from "@platitprosim/core";
import type { KeypadKey } from "@platitprosim/ui";
import type { Lang } from "../i18n";

/** The most one payment can ask for: 1 000 000 Kč. */
export const MAX_AMOUNT = CzkAmount.make(100_000_000);

/** Applies a keypad key to what the merchant typed, never past `MAX_AMOUNT`. */
export const pressAmountKey = (input: KeypadInput, key: KeypadKey) =>
  pressKeypadKey(input, key === "decimal" ? "," : key, MAX_AMOUNT);

export const canRequestPayment = (input: KeypadInput) =>
  keypadAmount(input) > 0;

const separators = {
  cs: { group: " ", decimal: "," },
  en: { group: ",", decimal: "." },
} as const satisfies Record<Lang, { group: string; decimal: string }>;

export const decimalSymbol = (lang: Lang) => separators[lang].decimal;

/** Shows the typed amount as typed, e.g. a trailing comma, with the language's separators. */
export const formatAmountInput = (input: KeypadInput, lang: Lang): string => {
  const [whole = "", fraction] = input.split(",");
  const { group, decimal } = separators[lang];
  const grouped = (whole || "0").replace(/\B(?=(\d{3})+(?!\d))/gu, group);
  return fraction === undefined ? grouped : `${grouped}${decimal}${fraction}`;
};
