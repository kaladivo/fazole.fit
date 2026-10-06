import type { Payment, Receipt, Withdrawal } from "../storage";

/** One line of wallet activity: the sats that reached or left the wallet, and the fee among them. */
export type WalletActivity =
  | {
      readonly kind: "lightning";
      readonly id: string;
      readonly atMs: number;
      readonly sats: number;
      readonly feeSats: 0;
    }
  | {
      readonly kind: "receipt";
      readonly id: string;
      readonly atMs: number;
      /** Net of the mint's input fee. */
      readonly sats: number;
      /** What the payment asked beyond what arrived; 0 without a payment. */
      readonly feeSats: number;
      readonly receipt: Receipt;
    }
  | {
      readonly kind: "withdrawal";
      readonly id: string;
      readonly atMs: number;
      /** The amount and every fee; nothing for a failed one, whose funds came back. */
      readonly sats: number;
      readonly feeSats: number;
      readonly withdrawal: Withdrawal;
    };

/**
 * What moved through this wallet, newest first: this device's paid Lightning
 * payments (the minted sats), every Cashu receipt (a customer's token,
 * assigned or not, and employees' forwards, net of fees) and withdrawals
 * with their fees. Bank payments never touch the wallet, and an employee's
 * payment reaches it as a forward.
 */
export const walletActivity = (
  payments: readonly Payment[],
  receipts: readonly Receipt[],
  withdrawals: readonly Withdrawal[],
  limit = 30,
): WalletActivity[] => {
  const askedSats = new Map<string, number | null>(
    payments.map(({ id, sats }) => [id, sats]),
  );
  return [
    ...payments.flatMap((payment): WalletActivity[] =>
      payment.status === "paid" &&
      payment.method === "lightning" &&
      payment.employeeId === null &&
      payment.sats !== null
        ? [
            {
              kind: "lightning",
              id: payment.id,
              atMs: payment.paidAtMs ?? payment.updatedAtMs,
              sats: payment.sats,
              feeSats: 0,
            },
          ]
        : [],
    ),
    ...receipts.map((receipt): WalletActivity => {
      const asked =
        receipt.paymentId === null ? null : askedSats.get(receipt.paymentId);
      return {
        kind: "receipt",
        id: receipt.id,
        atMs: receipt.receivedAtMs,
        sats: receipt.sats,
        feeSats: asked ? Math.max(0, asked - receipt.sats) : 0,
        receipt,
      };
    }),
    ...withdrawals.map((withdrawal): WalletActivity => {
      const feeSats = withdrawal.feeSats ?? 0;
      return {
        kind: "withdrawal",
        id: withdrawal.id,
        atMs: withdrawal.createdAtMs,
        sats:
          withdrawal.status === "failed" ? 0 : withdrawal.amountSats + feeSats,
        feeSats: withdrawal.status === "failed" ? 0 : feeSats,
        withdrawal,
      };
    }),
  ]
    .sort((a, b) => b.atMs - a.atMs)
    .slice(0, limit);
};

/** The sats an activity line added to the balance; negative for a withdrawal. */
export const balanceChange = (item: WalletActivity): number =>
  item.kind === "withdrawal" ? -item.sats : item.sats;

/** A typed amount of whole sats; `null` unless it is a positive integer. */
export const parseSats = (text: string): number | null => {
  const digits = text.replace(/\s/gu, "");
  if (!/^\d{1,15}$/u.test(digits)) return null;
  const sats = Number(digits);
  return sats > 0 ? sats : null;
};
