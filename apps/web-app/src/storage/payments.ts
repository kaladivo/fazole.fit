import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import {
  canChangePaymentStatus,
  cashuRequestMint,
  CzkAmount,
  generateVariableSymbol,
  PaymentMethod,
  PaymentStatus,
  Sats,
  VariableSymbol,
} from "@platitprosim/core";
import type { OpenBitcoinPayment } from "@platitprosim/core";
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
  quoteId: Schema.NullOr(Schema.String),
  invoice: Schema.NullOr(Schema.String),
  paymentRequest: Schema.NullOr(Schema.String),
  czkPerBtc: Schema.NullOr(Schema.Number),
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

/** A new pending payment; its method is settled by whichever leg the customer pays. */
export const createPayment = (
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

/** The Bitcoin leg of a payment: its price in sats, the Lightning quote and the Cashu request. */
export interface BitcoinRequest {
  readonly sats: Sats;
  readonly czkPerBtc: number;
  readonly quoteId: string;
  readonly invoice: string;
  readonly paymentRequest: string;
}

export const attachBitcoinRequest = (
  evolu: AppEvolu,
  id: PaymentRowId,
  request: BitcoinRequest,
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.update(
      "payment",
      { id, ...request, updatedAtMs: now },
      { onComplete },
    ),
  );

/** Drops an expired Bitcoin leg, so the payment screen asks for a fresh one. */
export const clearBitcoinRequest = (
  evolu: AppEvolu,
  id: PaymentRowId,
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.update(
      "payment",
      {
        id,
        sats: null,
        czkPerBtc: null,
        quoteId: null,
        invoice: null,
        paymentRequest: null,
        updatedAtMs: now,
      },
      { onComplete },
    ),
  );

/** The Bitcoin leg of a payment, once it has one. */
export const bitcoinRequestOf = (payment: Payment): BitcoinRequest | null =>
  payment.sats !== null &&
  payment.czkPerBtc !== null &&
  payment.quoteId !== null &&
  payment.invoice !== null &&
  payment.paymentRequest !== null
    ? {
        sats: payment.sats,
        czkPerBtc: payment.czkPerBtc,
        quoteId: payment.quoteId,
        invoice: payment.invoice,
        paymentRequest: payment.paymentRequest,
      }
    : null;

export type OpenPayment = OpenBitcoinPayment & {
  readonly payment: Payment;
  readonly request: BitcoinRequest;
};

/** Unpaid payments with a Bitcoin leg a token or a Lightning payment can still settle. */
export const openBitcoinPayments = (payments: readonly Payment[]) =>
  payments.flatMap((payment): OpenPayment[] => {
    const request = bitcoinRequestOf(payment);
    const mintUrl = request && cashuRequestMint(request.paymentRequest);
    return payment.status === "paid" || !request || !mintUrl
      ? []
      : [{ ...payment, mintUrl, sats: request.sats, payment, request }];
  });

/** Marks the payment paid by `method` when its status still allows it. */
export const completePayment = async (
  evolu: AppEvolu,
  payment: Payment,
  method: PaymentMethod,
  now = Date.now(),
): Promise<boolean> => {
  if (!canChangePaymentStatus(payment.status, "paid")) return false;
  await mutation((onComplete) =>
    evolu.update(
      "payment",
      {
        id: payment.id,
        status: "paid",
        method,
        paidAtMs: now,
        updatedAtMs: now,
      },
      { onComplete },
    ),
  );
  return true;
};

export const cancelPayment = async (
  evolu: AppEvolu,
  payment: Payment,
  now = Date.now(),
): Promise<void> => {
  if (!canChangePaymentStatus(payment.status, "cancelled")) return;
  await mutation((onComplete) =>
    evolu.update(
      "payment",
      { id: payment.id, status: "cancelled", updatedAtMs: now },
      { onComplete },
    ),
  );
};
