import { CzkAmount } from "@platitprosim/core";
import type { PaymentStatus } from "@platitprosim/core";

interface DatedPayment {
  readonly createdAtMs: number;
  readonly status: PaymentStatus;
  readonly amountCzk: CzkAmount;
}

export interface PaymentDay<P extends DatedPayment> {
  /** Local midnight that starts the day. */
  readonly startMs: number;
  /** What was actually paid that day; pending and cancelled payments do not count. */
  readonly paidTotal: CzkAmount;
  readonly payments: readonly P[];
}

const startOfDay = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);

/** Groups payments, newest first, by the local day they were created on. */
export const groupByDay = <P extends DatedPayment>(
  payments: readonly P[],
): PaymentDay<P>[] => {
  const days = new Map<number, P[]>();
  for (const payment of payments) {
    const day = startOfDay(payment.createdAtMs);
    days.set(day, [...(days.get(day) ?? []), payment]);
  }
  return [...days]
    .sort(([a], [b]) => b - a)
    .map(([startMs, dayPayments]) => ({
      startMs,
      paidTotal: CzkAmount.make(
        dayPayments
          .filter((payment) => payment.status === "paid")
          .reduce((total, payment) => total + payment.amountCzk, 0),
      ),
      payments: [...dayPayments].sort((a, b) => b.createdAtMs - a.createdAtMs),
    }));
};

/** "today" or "yesterday" relative to `nowMs`, otherwise `null` for a dated label. */
export const relativeDay = (
  startMs: number,
  nowMs: number,
): "today" | "yesterday" | null => {
  const today = startOfDay(nowMs);
  if (startMs === today) return "today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return startMs === yesterday.getTime() ? "yesterday" : null;
};
