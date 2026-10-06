import {
  CZECH_BANKS,
  czechAccountToIban,
  parseCzechAccount,
} from "@platitprosim/core";
import type { CzechAccount, CzechAccountErrorReason } from "@platitprosim/core";
import { Either } from "effect";
import { useState } from "react";
import type { I18nKey } from "../i18n";
import type { ShopDetails } from "../storage";

const accountErrors: Record<CzechAccountErrorReason, I18nKey> = {
  invalidFormat: "bankAccountInvalidFormat",
  invalidChecksum: "bankAccountInvalidChecksum",
  unknownBank: "bankAccountUnknownBank",
};

export type AccountCheck =
  | {
      readonly ok: true;
      readonly account: CzechAccount;
      readonly bank: string;
      readonly iban: string;
    }
  | { readonly ok: false; readonly error: I18nKey };

/** Groups an IBAN by four characters, the way banks print it. */
export const formatIban = (iban: string) =>
  iban.replace(/(.{4})(?=.)/gu, "$1 ");

export const checkAccount = (input: string): AccountCheck => {
  const parsed = parseCzechAccount(input);
  if (Either.isLeft(parsed)) {
    return { ok: false, error: accountErrors[parsed.left.reason] };
  }
  const account = parsed.right;
  return {
    ok: true,
    account,
    bank: CZECH_BANKS[account.bankCode] ?? account.bankCode,
    iban: formatIban(czechAccountToIban(account)),
  };
};

/** Typing a four-digit bank code finishes the account, so its error can show before the field loses focus. */
export const looksComplete = (input: string) => /\/\s*\d{4}\s*$/u.test(input);

/** The shop name and bank account fields with their live validation. */
export const useShopForm = (initial = { name: "", account: "" }) => {
  const [name, setName] = useState(initial.name);
  const [account, setAccount] = useState(initial.account);
  const [accountTouched, setAccountTouched] = useState(initial.account !== "");
  const [submitted, setSubmitted] = useState(false);
  const accountCheck = checkAccount(account);
  const showAccountError =
    submitted ||
    ((accountTouched || looksComplete(account)) && account.trim() !== "");
  return {
    name,
    setName,
    account,
    setAccount,
    touchAccount: () => setAccountTouched(true),
    accountCheck,
    nameError:
      submitted && name.trim() === "" ? ("shopNameRequired" as const) : null,
    accountError:
      !accountCheck.ok && showAccountError ? accountCheck.error : null,
    /** The details to save, or `null` after revealing what is wrong. */
    submit: (): ShopDetails | null => {
      setSubmitted(true);
      return name.trim() !== "" && accountCheck.ok
        ? { name: name.trim(), account: accountCheck.account }
        : null;
    },
  };
};

export type ShopForm = ReturnType<typeof useShopForm>;
