import { useState } from "react";
import type { ReactNode } from "react";
import { DemoContext, ownerId, seedEmployees, seedPayments } from "./store";
import type { DemoState } from "./store";

/** In-memory shop data shared by every phone on the page, so a payment in one shows up in the others. */
export function DemoProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState(seedPayments);
  const [employees, setEmployees] = useState(seedEmployees);
  const [balanceSats, setBalanceSats] = useState(184_210);
  const demo: DemoState = {
    payments,
    employees,
    balanceSats,
    addPayment: (payment) => {
      setPayments((current) => [
        {
          ...payment,
          id: `new-${current.length}`,
          at: new Date(),
          createdBy: ownerId,
        },
        ...current,
      ]);
      if (payment.sats !== undefined) {
        setBalanceSats((current) => current + (payment.sats ?? 0));
      }
    },
    addEmployee: (name) =>
      setEmployees((current) => [
        ...current,
        { id: `employee-${current.length}`, name, addedToday: true },
      ]),
    spend: (sats) => setBalanceSats((current) => Math.max(0, current - sats)),
  };
  return <DemoContext value={demo}>{children}</DemoContext>;
}
