import { Schema } from "effect";

export const PaymentId = Schema.NonEmptyTrimmedString.pipe(
  Schema.maxLength(64),
  Schema.brand("PaymentId"),
);
export type PaymentId = typeof PaymentId.Type;

export const PaymentMethod = Schema.Literal("bank", "lightning", "cashu");
export type PaymentMethod = typeof PaymentMethod.Type;

export const PaymentStatus = Schema.Literal("pending", "paid", "cancelled");
export type PaymentStatus = typeof PaymentStatus.Type;

const NEXT_STATUSES: Readonly<
  Record<PaymentStatus, ReadonlyArray<PaymentStatus>>
> = {
  pending: ["paid", "cancelled"],
  // A Lightning or Cashu payment can still arrive after the merchant cancels.
  cancelled: ["paid"],
  paid: [],
};

export const canChangePaymentStatus = (
  from: PaymentStatus,
  to: PaymentStatus,
): boolean => NEXT_STATUSES[from].includes(to);
