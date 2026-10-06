import type { Payment, Withdrawal } from "../storage";

/** One line of wallet activity: sats in from a Bitcoin payment, or out in a withdrawal. */
export type WalletActivity =
  | {
      readonly kind: "payment";
      readonly id: string;
      readonly atMs: number;
      readonly sats: number;
      readonly method: "lightning" | "cashu";
    }
  | {
      readonly kind: "withdrawal";
      readonly id: string;
      readonly atMs: number;
      readonly sats: number;
      readonly withdrawal: Withdrawal;
    };

/** Paid Bitcoin payments in this wallet and withdrawals, newest first; bank payments never touch the wallet. */
export const walletActivity = (
  payments: readonly Payment[],
  withdrawals: readonly Withdrawal[],
  limit = 30,
): WalletActivity[] =>
  [
    ...payments.flatMap((payment): WalletActivity[] =>
      payment.status === "paid" &&
      payment.method !== "bank" &&
      payment.sats !== null &&
      // An employee's sats count once they reached this wallet.
      (payment.employeeId === null || payment.forwardedAtMs !== null)
        ? [
            {
              kind: "payment",
              id: payment.id,
              atMs: payment.paidAtMs ?? payment.updatedAtMs,
              sats: payment.sats,
              method: payment.method,
            },
          ]
        : [],
    ),
    ...withdrawals.map(
      (withdrawal): WalletActivity => ({
        kind: "withdrawal",
        id: withdrawal.id,
        atMs: withdrawal.createdAtMs,
        sats: withdrawal.amountSats + (withdrawal.feeSats ?? 0),
        withdrawal,
      }),
    ),
  ]
    .sort((a, b) => b.atMs - a.atMs)
    .slice(0, limit);

/** A typed amount of whole sats; `null` unless it is a positive integer. */
export const parseSats = (text: string): number | null => {
  const digits = text.replace(/\s/gu, "");
  if (!/^\d{1,15}$/u.test(digits)) return null;
  const sats = Number(digits);
  return sats > 0 ? sats : null;
};
