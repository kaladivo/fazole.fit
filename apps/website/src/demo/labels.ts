import type { IconName } from "@platitprosim/ui";
import type { Locale, SiteCopy } from "../copy";
import { formatCrowns } from "./money";
import { ownerId } from "./store";
import type { DemoEmployee, DemoPayment, PaymentMethod } from "./store";

export const methodIcons: Record<PaymentMethod, IconName> = {
  bank: "Landmark",
  lightning: "Zap",
  cashu: "Bitcoin",
};

export const methodLabel = (method: PaymentMethod, copy: SiteCopy) =>
  copy.demo[method];

/** Who took a payment: "Me" for the owner, else the employee's name. */
export const creatorName = (
  payment: DemoPayment,
  employees: readonly DemoEmployee[],
  copy: SiteCopy,
) =>
  payment.createdBy === ownerId
    ? copy.demo.me
    : (employees.find((employee) => employee.id === payment.createdBy)?.name ??
      copy.demo.employee);

/** `npub1abcd…wxyz`, like the app's. */
export const shortNpub = (npub: string) =>
  `${npub.slice(0, 9)}…${npub.slice(-4)}`;

/** The npub in a typed or scanned profile: a bare npub, a `nostr:` URI or a Linky link. */
export const npubIn = (input: string) => /npub1[a-z0-9]+/u.exec(input)?.[0];

/** A typed amount of whole sats; `undefined` unless it is a positive integer. */
export const parseSats = (text: string) => {
  const digits = text.replace(/\s/gu, "");
  return /^\d{1,15}$/u.test(digits) && Number(digits) > 0
    ? Number(digits)
    : undefined;
};

const intlLocales = { cs: "cs-CZ", en: "en-GB" } as const satisfies Record<
  Locale,
  string
>;

export const formatTime = (date: Date, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocales[locale], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

export const formatDateTime = (date: Date, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocales[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

/** "1 250 Kč" or "1,250 CZK", the way the app writes an amount. */
export const czk = (halere: number, copy: SiteCopy, locale: Locale) =>
  copy.demo.amountCzk(formatCrowns(halere, locale));

export const paidTotal = (payments: readonly DemoPayment[]) =>
  payments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + payment.halere, 0);

const startOfDay = (date: Date) => new Date(date).setHours(0, 0, 0, 0);

/** Payments grouped by the local day they were created on, newest first. */
export const groupByDay = (payments: readonly DemoPayment[]) => {
  const days = new Map<number, DemoPayment[]>();
  for (const payment of payments) {
    const day = startOfDay(payment.at);
    days.set(day, [...(days.get(day) ?? []), payment]);
  }
  return [...days]
    .sort(([a], [b]) => b - a)
    .map(([startMs, dayPayments]) => ({
      startMs,
      payments: dayPayments.sort((a, b) => b.at.getTime() - a.at.getTime()),
    }));
};

/** "Today", "Yesterday" or the date, like the app's history headings. */
export const dayTitle = (startMs: number, copy: SiteCopy, locale: Locale) => {
  const today = startOfDay(new Date());
  const yesterday = new Date(today).setDate(new Date(today).getDate() - 1);
  if (startMs === today) return copy.demo.today;
  if (startMs === yesterday) return copy.demo.yesterday;
  return new Intl.DateTimeFormat(intlLocales[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(startMs);
};
