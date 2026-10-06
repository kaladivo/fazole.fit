import type { IconName } from "@platitprosim/ui";
import type { SiteCopy } from "../copy";
import type { Locale } from "../copy";
import { ownerId } from "./store";
import type { DemoEmployee, DemoPayment, PaymentMethod } from "./store";

export const methodIcons: Record<PaymentMethod, IconName> = {
  bank: "Landmark",
  lightning: "Zap",
  cashu: "Bitcoin",
};

export const methodLabel = (method: PaymentMethod, copy: SiteCopy) =>
  copy.demo[method === "bank" ? "bank" : method];

/** Who created a payment: "You" for the owner, else the employee's first name. */
export const creatorName = (
  payment: DemoPayment,
  employees: readonly DemoEmployee[],
  copy: SiteCopy,
) =>
  payment.createdBy === ownerId
    ? copy.demo.you
    : (employees
        .find((employee) => employee.id === payment.createdBy)
        ?.name.split(" ")[0] ?? "");

export const formatTime = (date: Date, locale: Locale) =>
  date.toLocaleTimeString(locale === "cs" ? "cs-CZ" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const paidTotal = (payments: readonly DemoPayment[]) =>
  payments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + payment.halere, 0);
