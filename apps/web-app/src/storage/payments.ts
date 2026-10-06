import { NonEmptyString1000, sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import {
  canChangePaymentStatus,
  cashuRequestMint,
  CzkAmount,
  generateVariableSymbol,
  isOpenBitcoinRequest,
  OPEN_REQUEST_MS,
  PaymentId,
  PaymentMethod,
  PaymentStatus,
  Sats,
  VariableSymbol,
} from "@platitprosim/core";
import type { OpenBitcoinPayment, PaymentRecord } from "@platitprosim/core";
import type { Pubkey } from "@linky-fit/linkstr";
import { Schema } from "effect";
import type { AppEvolu } from "./evolu";
import { mutation, useAppEvolu } from "./evolu";
import { decodeRows } from "./rows";
import { PaymentRowId, reportedPaymentIdFor } from "./schema";
import type { EmployeeId } from "./schema";

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
  cashuReceiveId: Schema.NullOr(Schema.String),
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

const toPayments = decodeRows<typeof PaymentFields.Type, PaymentRowId>(
  decodePaymentFields,
);

/** Newest first. */
export const usePayments = (): Payment[] =>
  toPayments(useQuery(paymentsQuery(useAppEvolu())));

export const loadPayments = async (evolu: AppEvolu): Promise<Payment[]> =>
  toPayments(await evolu.loadQuery(paymentsQuery(evolu)));

const paymentsWhere = (
  evolu: AppEvolu,
  column: "quoteId" | "forwardOperationId" | "cashuReceiveId",
  value: NonEmptyString1000,
) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("payment")
      .selectAll()
      .where(column, "=", value)
      .where("isDeleted", "is not", sqliteTrue),
  );

/** The payments whose `column` holds `value`. */
const loadPaymentsWhere = async (
  evolu: AppEvolu,
  column: Parameters<typeof paymentsWhere>[1],
  value: string,
): Promise<Payment[]> =>
  NonEmptyString1000.is(value)
    ? toPayments(await evolu.loadQuery(paymentsWhere(evolu, column, value)))
    : [];

export const loadPayment = async (
  evolu: AppEvolu,
  id: string,
): Promise<Payment | null> => {
  if (!PaymentRowId.is(id)) return null;
  const rows = await evolu.loadQuery(
    evolu.createQuery((db) =>
      db
        .selectFrom("payment")
        .selectAll()
        .where("id", "=", id)
        .where("isDeleted", "is not", sqliteTrue),
    ),
  );
  return toPayments(rows)[0] ?? null;
};

export const loadPaymentWithQuote = async (
  evolu: AppEvolu,
  quoteId: string,
): Promise<Payment | null> =>
  (await loadPaymentsWhere(evolu, "quoteId", quoteId))[0] ?? null;

/** Employee: the payments whose sats a forward's token carries. */
export const loadPaymentsForwardedBy = (evolu: AppEvolu, operationId: string) =>
  loadPaymentsWhere(evolu, "forwardOperationId", operationId);

/** The payment a Cashu receive already paid. */
export const loadPaymentPaidBy = async (
  evolu: AppEvolu,
  receiveId: string,
): Promise<Payment | null> =>
  (await loadPaymentsWhere(evolu, "cashuReceiveId", receiveId))[0] ?? null;

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

/**
 * Drops an expired Lightning quote, so the payment screen asks for a fresh
 * leg. The Cashu request stays payable until then: a wallet may still pay it.
 */
export const clearBitcoinRequest = (
  evolu: AppEvolu,
  id: PaymentRowId,
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.update(
      "payment",
      { id, quoteId: null, invoice: null, updatedAtMs: now },
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

export type OpenPayment = OpenBitcoinPayment & { readonly payment: Payment };

/** The mint a payment's Bitcoin leg is payable at, also once its quote expired. */
export const paymentMintOf = (payment: Payment): string | null =>
  payment.paymentRequest === null
    ? null
    : cashuRequestMint(payment.paymentRequest);

const bitcoinRequestsWhere = (
  payments: readonly Payment[],
  isCandidate: (payment: Payment) => boolean,
) =>
  payments.flatMap((payment): OpenPayment[] => {
    const mintUrl = paymentMintOf(payment);
    return payment.sats === null || !mintUrl || !isCandidate(payment)
      ? []
      : [{ ...payment, mintUrl, sats: payment.sats, payment }];
  });

/** This device's recent unpaid Bitcoin requests, also cancelled ones: a token can still pay each. */
export const openBitcoinPayments = (
  payments: readonly Payment[],
  now = Date.now(),
) =>
  bitcoinRequestsWhere(payments, (payment) =>
    isOpenBitcoinRequest(payment, now),
  );

/** This device's recent paid Bitcoin requests, which a customer may pay a second time. */
export const paidBitcoinPayments = (
  payments: readonly Payment[],
  now = Date.now(),
) =>
  bitcoinRequestsWhere(
    payments,
    (payment) =>
      payment.status === "paid" && now - payment.createdAtMs < OPEN_REQUEST_MS,
  );

/** Marks the payment paid when its status still allows it; a Cashu payment names the receive that paid it. */
export const completePayment = async (
  evolu: AppEvolu,
  payment: Payment,
  paidBy: "bank" | "lightning" | { readonly cashuReceiveId: string },
  now = Date.now(),
): Promise<boolean> => {
  if (!canChangePaymentStatus(payment.status, "paid")) return false;
  await mutation((onComplete) =>
    evolu.update(
      "payment",
      {
        id: payment.id,
        status: "paid",
        ...(typeof paidBy === "string"
          ? { method: paidBy }
          : { method: "cashu", cashuReceiveId: paidBy.cashuReceiveId }),
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
  const stored = await loadPayment(evolu, id);
  if (!shouldApplyRecord(stored ?? undefined, record)) return false;
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
