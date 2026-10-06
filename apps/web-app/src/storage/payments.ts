import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import {
  canChangePaymentStatus,
  CzkAmount,
  generateVariableSymbol,
  PaymentMethod,
  PaymentStatus,
  Sats,
  VariableSymbol,
} from "@platitprosim/core";
import type { Pubkey } from "@linky-fit/linkstr";
import { Option, Schema } from "effect";
import type { AppEvolu } from "./evolu";
import { mutation, useAppEvolu } from "./evolu";
import { PaymentRowId } from "./schema";

const PaymentFields = Schema.Struct({
  amountCzk: CzkAmount,
  sats: Schema.NullOr(Sats),
  method: PaymentMethod,
  status: PaymentStatus,
  vs: Schema.NullOr(VariableSymbol),
  createdAtMs: Schema.Int,
  updatedAtMs: Schema.Int,
  paidAtMs: Schema.NullOr(Schema.Int),
  createdBy: Schema.String,
});
const decodePaymentFields = Schema.decodeUnknownOption(PaymentFields);

export type Payment = typeof PaymentFields.Type & { readonly id: PaymentRowId };

const paymentsQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("payment")
      .selectAll()
      .where("isDeleted", "is not", sqliteTrue)
      .orderBy("createdAtMs", "desc"),
  );

type PaymentRow = { readonly id: PaymentRowId } & Record<string, unknown>;

/** Rows that have not fully synced yet, or do not validate, are left out. */
const toPayments = (rows: ReadonlyArray<PaymentRow>): Payment[] =>
  rows.flatMap((row) =>
    Option.toArray(
      Option.map(decodePaymentFields(row), (fields) => ({
        ...fields,
        id: row.id,
      })),
    ),
  );

/** Newest first. */
export const usePayments = (): Payment[] =>
  toPayments(useQuery(paymentsQuery(useAppEvolu())));

export const loadPayments = async (evolu: AppEvolu): Promise<Payment[]> =>
  toPayments(await evolu.loadQuery(paymentsQuery(evolu)));

/** The payment named by a route, `null` while it is unknown. */
export const usePayment = (id: string): Payment | null => {
  const payments = usePayments();
  return payments.find((payment) => payment.id === id) ?? null;
};

export const createBankPayment = (
  evolu: AppEvolu,
  { amountCzk, createdBy }: { amountCzk: CzkAmount; createdBy: Pubkey },
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.insert(
      "payment",
      {
        amountCzk,
        method: "bank",
        status: "pending",
        vs: generateVariableSymbol(),
        createdAtMs: now,
        updatedAtMs: now,
        createdBy,
      },
      { onComplete },
    ),
  );

/** Moves the payment to `status` when its current status allows it; `paid` stamps `paidAtMs`. */
export const changePaymentStatus = async (
  evolu: AppEvolu,
  payment: Payment,
  status: PaymentStatus,
  now = Date.now(),
): Promise<void> => {
  if (!canChangePaymentStatus(payment.status, status)) return;
  await mutation((onComplete) =>
    evolu.update(
      "payment",
      {
        id: payment.id,
        status,
        updatedAtMs: now,
        ...(status === "paid" ? { paidAtMs: now } : {}),
      },
      { onComplete },
    ),
  );
};
