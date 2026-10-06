import type { PaymentMethod, PaymentStatus } from "@platitprosim/core";
import type { IconName } from "@platitprosim/ui";
import type { I18nKey } from "../i18n";

export const statusLabels: Record<PaymentStatus, I18nKey> = {
  pending: "statusPending",
  paid: "statusPaid",
  cancelled: "statusCancelled",
};

export const methodLabels: Record<PaymentMethod, I18nKey> = {
  bank: "methodBank",
  lightning: "methodLightning",
  cashu: "methodCashu",
};

export const methodIcons: Record<PaymentMethod, IconName> = {
  bank: "Landmark",
  lightning: "Zap",
  cashu: "Bitcoin",
};
