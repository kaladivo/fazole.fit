import type { CzkAmount } from "@platitprosim/core";
import type { Lang } from ".";

const locales = { cs: "cs-CZ", en: "en-GB" } as const satisfies Record<
  Lang,
  string
>;

/** The amount without its currency, e.g. "1 250,50"; whole crowns drop the haléře. */
export const formatCzkValue = (amount: CzkAmount, lang: Lang) =>
  new Intl.NumberFormat(locales[lang], {
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);

export const formatTime = (ms: number, lang: Lang) =>
  new Intl.DateTimeFormat(locales[lang], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(ms);

export const formatDate = (ms: number, lang: Lang) =>
  new Intl.DateTimeFormat(locales[lang], {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(ms);

export const formatDateTime = (ms: number, lang: Lang) =>
  new Intl.DateTimeFormat(locales[lang], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(ms);
