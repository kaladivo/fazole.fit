import type { KeypadKey } from "@platitprosim/ui";
import type { Locale } from "../copy";

/** A fixed demo rate, so the sats figures stay stable between visits. */
export const demoCzkPerBtc = 2_000_000;

const satsPerBtc = 100_000_000;
const maxWholeDigits = 6;
const maxDecimals = 2;

/** Applies a keypad key to the typed amount: whole crowns, then "," and up to two haléře digits. */
export const pressKey = (input: string, key: KeypadKey): string => {
  const [whole = "", decimals] = input.split(",");
  if (key === "backspace") return input.slice(0, -1);
  if (key === "decimal") {
    return decimals === undefined ? `${whole || "0"},` : input;
  }
  if (decimals !== undefined) {
    return decimals.length < maxDecimals ? input + key : input;
  }
  if (whole === "0") return key;
  return whole.length < maxWholeDigits ? input + key : input;
};

/** The typed amount in haléře, e.g. "12,5" is 1250. */
export const typedHalere = (input: string): number => {
  const [whole = "", decimals = ""] = input.split(",");
  return Number(whole || "0") * 100 + Number(decimals.padEnd(2, "0"));
};

const intlLocale = (locale: Locale) => (locale === "cs" ? "cs-CZ" : "en-US");

export const decimalSymbol = (locale: Locale) => (locale === "cs" ? "," : ".");

/** The typed amount as the keypad shows it, grouped by thousands, e.g. "1 250,5". */
export const formatTyped = (input: string, locale: Locale): string => {
  const [whole = "", decimals] = input.split(",");
  const grouped = formatNumber(Number(whole || "0"), locale);
  return decimals === undefined
    ? grouped
    : `${grouped}${decimalSymbol(locale)}${decimals}`;
};

export const formatNumber = (value: number, locale: Locale): string =>
  new Intl.NumberFormat(intlLocale(locale)).format(value);

/** Crowns without the currency, e.g. "1 250" or "89,50". */
export const formatCrowns = (halere: number, locale: Locale): string =>
  new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: halere % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(halere / 100);

/** Crowns with the currency, e.g. "1 250 Kč" or "CZK 1,250". */
export const formatCzk = (halere: number, locale: Locale): string =>
  new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: halere % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(halere / 100);

/** Rounds up, so the merchant never receives less than the CZK amount. */
export const halereToSats = (halere: number): number =>
  Math.ceil((halere * satsPerBtc) / (demoCzkPerBtc * 100));

export const satsToHalere = (sats: number): number =>
  Math.round((sats * demoCzkPerBtc * 100) / satsPerBtc);
