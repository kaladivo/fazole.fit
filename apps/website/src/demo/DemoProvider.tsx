import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { randomVariableSymbol } from "./qr";
import {
  DemoContext,
  ownerId,
  seedEmployees,
  seedPayments,
  seedWithdrawals,
} from "./store";
import type { DemoActions, DemoPayment } from "./store";

/** In-memory shop data shared by every phone on the page, so a payment in one shows up in the others. */
export function DemoProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState(seedPayments);
  const [employees, setEmployees] = useState(seedEmployees);
  const [withdrawals, setWithdrawals] = useState(seedWithdrawals);
  const [balanceSats, setBalanceSats] = useState(184_210);
  // Stable actions, so a mock's effect that uses one does not restart on every change.
  const actions = useMemo<DemoActions>(
    () => ({
      requestPayment: (halere) => {
        const variableSymbol = randomVariableSymbol();
        const payment: DemoPayment = {
          id: `payment-${variableSymbol}`,
          halere,
          method: "bank",
          status: "pending",
          variableSymbol,
          createdBy: ownerId,
          at: new Date(),
        };
        setPayments((current) => [payment, ...current]);
        return payment;
      },
      settlePayment: (id, settlement) => {
        setPayments((current) =>
          current.map((payment) =>
            payment.id === id && payment.status === "pending"
              ? {
                  ...payment,
                  ...settlement,
                  ...(settlement.status === "paid"
                    ? { paidAt: new Date() }
                    : {}),
                }
              : payment,
          ),
        );
        if (settlement.status === "paid" && settlement.method === "lightning") {
          setBalanceSats((current) => current + settlement.sats);
        }
      },
      addEmployee: (name, npub) =>
        setEmployees((current) => [
          ...current,
          {
            id: `employee-${current.length}`,
            name,
            npub,
            linked: false,
          },
        ]),
      withdraw: (kind, sats) => {
        setBalanceSats((current) => Math.max(0, current - sats));
        setWithdrawals((current) => [
          { id: `withdrawal-${current.length}`, kind, sats, at: new Date() },
          ...current,
        ]);
      },
    }),
    [],
  );
  return (
    <DemoContext
      value={{ payments, employees, withdrawals, balanceSats, ...actions }}
    >
      {children}
    </DemoContext>
  );
}
