import { Schema } from "effect";

/** CZK amount in haléře (1 CZK = 100 haléřů). */
export const CzkAmount = Schema.Int.pipe(
  Schema.nonNegative(),
  Schema.brand("CzkAmount"),
);
export type CzkAmount = typeof CzkAmount.Type;

export const Sats = Schema.Int.pipe(Schema.nonNegative(), Schema.brand("Sats"));
export type Sats = typeof Sats.Type;

export type Language = "cs" | "en";

export type KeypadKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | ","
  | "backspace";

/** What the merchant typed, e.g. `"12,5"`. The empty string means nothing typed yet. */
export type KeypadInput = string;

const DECIMAL_COMMA = ",";

export const keypadAmount = (input: KeypadInput): CzkAmount => {
  const [whole = "", fraction = ""] = input.split(DECIMAL_COMMA);
  return CzkAmount.make(
    Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0")),
  );
};

export const pressKeypadKey = (
  input: KeypadInput,
  key: KeypadKey,
  maxAmount: CzkAmount,
): KeypadInput => {
  if (key === "backspace") return input.slice(0, -1);
  if (key === DECIMAL_COMMA) {
    return input.includes(DECIMAL_COMMA)
      ? input
      : `${input || "0"}${DECIMAL_COMMA}`;
  }
  const fraction = input.split(DECIMAL_COMMA)[1];
  if (fraction !== undefined && fraction.length >= 2) return input;
  const next = input === "0" ? key : `${input}${key}`;
  return keypadAmount(next) <= maxAmount ? next : input;
};

export const formatCzk = (amount: CzkAmount, language: Language): string =>
  new Intl.NumberFormat(language === "cs" ? "cs-CZ" : "en-US", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);

const SATS_PER_BTC = 100_000_000n;

/** Rounds up so the merchant never receives less than the CZK amount. */
export const czkToSats = (amount: CzkAmount, czkPerBtc: number): Sats => {
  const halerePerBtc = BigInt(Math.round(czkPerBtc * 100));
  const numerator = BigInt(amount) * SATS_PER_BTC;
  const sats = (numerator + halerePerBtc - 1n) / halerePerBtc;
  return Sats.make(Number(sats));
};
