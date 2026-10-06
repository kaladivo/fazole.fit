import { CzkAmount } from "@platitprosim/core";
import type { PaymentStatus } from "@platitprosim/core";
import type { EmployeeId } from "../storage";

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

/** Everyone, the owner's own payments, or one employee's. */
export type HistoryFilter = "all" | "me" | EmployeeId;

export const filterPayments = <
  P extends { readonly employeeId: string | null },
>(
  payments: readonly P[],
  filter: HistoryFilter,
): P[] =>
  filter === "all"
    ? [...payments]
    : payments.filter((payment) =>
        filter === "me"
          ? payment.employeeId === null
          : payment.employeeId === filter,
      );

/** The filters worth offering: active employees, and removed ones who still have payments. */
export const historyFilters = (
  payments: readonly { readonly employeeId: string | null }[],
  employees: readonly {
    readonly id: EmployeeId;
    readonly removedAtMs: number | null;
  }[],
): HistoryFilter[] => [
  "all",
  "me",
  ...employees
    .filter(
      (employee) =>
        employee.removedAtMs === null ||
        payments.some((payment) => payment.employeeId === employee.id),
    )
    .map(({ id }) => id),
];
