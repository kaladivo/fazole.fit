import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import {
  canChangePaymentStatus,
  cashuRequestMint,
  CzkAmount,
  generateVariableSymbol,
  PaymentId,
  PaymentMethod,
  PaymentStatus,
  Sats,
  VariableSymbol,
} from "@platitprosim/core";
import type { OpenBitcoinPayment, PaymentRecord } from "@platitprosim/core";
import type { Pubkey } from "@linky-fit/linkstr";
import { Option, Schema } from "effect";
import type { AppEvolu } from "./evolu";
import { mutation, useAppEvolu } from "./evolu";
import { reportedPaymentIdFor } from "./schema";
import type { EmployeeId, PaymentRowId } from "./schema";

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
  employeeId: Schema.NullOr(Schema.String),
  lockedToken: Schema.NullOr(Schema.String),
  forwardOperationId: Schema.NullOr(Schema.String),
  forwardedAtMs: Schema.NullOr(Schema.Int),
  reportedAtMs: Schema.NullOr(Schema.Int),
});
const decodePaymentFields = Schema.decodeUnknownOption(PaymentFields);

export type Payment = typeof PaymentFields.Type & { readonly id: PaymentRowId };

export const paymentsQuery = (evolu: AppEvolu) =>
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

/** The message an employee device sends the owner for the payment's current state. */
export const paymentRecordOf = (payment: Payment): PaymentRecord => ({
  v: 1,
  type: "PaymentRecord",
  paymentId: PaymentId.make(payment.id),
  amountCzk: payment.amountCzk,
  method: payment.method,
  status: payment.status,
  createdAt: payment.createdAtMs,
  updatedAt: payment.updatedAtMs,
  ...(payment.sats === null ? {} : { sats: payment.sats }),
  ...(payment.vs === null ? {} : { vs: payment.vs }),
  ...(payment.paidAtMs === null ? {} : { paidAt: payment.paidAtMs }),
});

/** Employee: the payment changed since it was last queued to the owner. */
export const needsReport = (payment: Payment) =>
  payment.reportedAtMs !== payment.updatedAtMs;

export const markReported = (
  evolu: AppEvolu,
  id: PaymentRowId,
  updatedAtMs: number,
) =>
  mutation((onComplete) =>
    evolu.update("payment", { id, reportedAtMs: updatedAtMs }, { onComplete }),
  );

/** Employee: Bitcoin received on this device that has not reached the owner yet. */
export const needsForward = (payment: Payment) =>
  payment.status === "paid" &&
  payment.method !== "bank" &&
  payment.forwardedAtMs === null;

export const attachForward = (
  evolu: AppEvolu,
  id: PaymentRowId,
  forward: { readonly token: string; readonly operationId: string },
) =>
  mutation((onComplete) =>
    evolu.update(
      "payment",
      {
        id,
        lockedToken: forward.token,
        forwardOperationId: forward.operationId,
      },
      { onComplete },
    ),
  );

/** Employee: the token reached a relay. Owner: the token is in the wallet. */
export const markForwarded = (
  evolu: AppEvolu,
  id: PaymentRowId,
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.update("payment", { id, forwardedAtMs: now }, { onComplete }),
  );

/** Only a newer state replaces the stored one, so repeated and reordered records converge. */
export const shouldApplyRecord = (
  stored: Pick<Payment, "updatedAtMs"> | undefined,
  record: PaymentRecord,
) => stored === undefined || record.updatedAt > stored.updatedAtMs;

/** Owner: stores an employee's `PaymentRecord` under that employee unless a newer state is stored. */
export const upsertReportedPayment = async (
  evolu: AppEvolu,
  {
    device,
    employeeId,
    record,
  }: {
    readonly device: Pubkey;
    readonly employeeId: EmployeeId;
    readonly record: PaymentRecord;
  },
): Promise<boolean> => {
  const id = reportedPaymentIdFor(device, record.paymentId);
  const stored = (await loadPayments(evolu)).find(
    (payment) => payment.id === id,
  );
  if (!shouldApplyRecord(stored, record)) return false;
  await mutation((onComplete) =>
    evolu.upsert(
      "payment",
      {
        id,
        amountCzk: record.amountCzk,
        sats: record.sats ?? null,
        method: record.method,
        status: record.status,
        vs: record.vs ?? null,
        createdAtMs: record.createdAt,
        updatedAtMs: record.updatedAt,
        paidAtMs: record.paidAt ?? null,
        createdBy: device,
        employeeId,
      },
      { onComplete },
    ),
  );
  return true;
};
