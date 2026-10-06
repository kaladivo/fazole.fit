import type { KeypadKey } from "@platitprosim/ui";

const maxWholeDigits = 7;
const maxDecimals = 2;

/** Applies a keypad key to the typed amount: whole crowns, then optionally "," and up to two haléře digits. */
export const applyAmountKey = (amount: string, key: KeypadKey): string => {
  const [whole = "", decimals] = amount.split(",");
  if (key === "backspace") return amount.slice(0, -1);
  if (key === "decimal") {
    return decimals === undefined ? `${whole || "0"},` : amount;
  }
  if (decimals !== undefined) {
    return decimals.length < maxDecimals ? amount + key : amount;
  }
  if (whole === "0") return key;
  return whole.length < maxWholeDigits ? amount + key : amount;
};

/** Groups the whole crowns by thousands with no-break spaces, the Czech way. */
export const formatAmount = (amount: string): string => {
  const [whole = "", decimals] = amount.split(",");
  const grouped = (whole || "0").replace(/\B(?=(\d{3})+(?!\d))/gu, " ");
  return decimals === undefined ? grouped : `${grouped},${decimals}`;
};
