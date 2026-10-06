import { satsToCzk } from "@platitprosim/core";
import { useI18n } from "../i18n";
import type { I18nKey } from "../i18n";
import { formatCzkValue, formatWhole } from "../i18n/format";
import type { WithdrawFailure } from "../services";

export const failureMessages: Record<WithdrawFailure, I18nKey> = {
  "lnurl-failed": "failureLnurl",
  "insufficient-funds": "failureInsufficient",
  "mint-unreachable": "failureMint",
  "payment-failed": "failurePayment",
};

/** "≈ 52 Kč · 1 000 sat available" under an amount field. */
export const useAmountHint = (
  amount: number | null,
  balance: number,
  czkPerBtc: number | null,
) => {
  const { lang, t } = useI18n();
  const sats = formatWhole(balance, lang);
  return amount !== null && czkPerBtc !== null
    ? t("withdrawAmountHint", {
        amount: formatCzkValue(satsToCzk(amount, czkPerBtc), lang),
        sats,
      })
    : t("withdrawAvailable", { sats });
};
