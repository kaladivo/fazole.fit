import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import { Schema } from "effect";
import type { AppEvolu } from "./evolu";
import { mutation, useAppEvolu } from "./evolu";
import { decodeRows } from "./rows";
import { receiptIdFor } from "./schema";
import type { EmployeeId, PaymentRowId, ReceiptId } from "./schema";

export const ReceiptKind = Schema.Literal("cashu", "forward");
export type ReceiptKind = typeof ReceiptKind.Type;

const ReceiptFields = Schema.Struct({
  kind: ReceiptKind,
  sats: Schema.Int,
  receivedAtMs: Schema.Int,
  paymentId: Schema.NullOr(Schema.String),
  employeeId: Schema.NullOr(Schema.String),
});
const decodeReceipt = Schema.decodeUnknownOption(ReceiptFields);

export type Receipt = typeof ReceiptFields.Type & { readonly id: ReceiptId };

export const receiptsQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("receipt")
      .selectAll()
      .where("isDeleted", "is not", sqliteTrue)
      .orderBy("receivedAtMs", "desc"),
  );

const toReceipts = decodeRows<typeof ReceiptFields.Type, ReceiptId>(
  decodeReceipt,
);

/** Newest first. */
export const useReceipts = (): Receipt[] =>
  toReceipts(useQuery(receiptsQuery(useAppEvolu())));

export const loadReceipts = async (evolu: AppEvolu): Promise<Receipt[]> =>
  toReceipts(await evolu.loadQuery(receiptsQuery(evolu)));

/** Whether the receive `operationId` was already recorded, so its token was handled. */
export const hasReceipt = async (
  evolu: AppEvolu,
  operationId: string,
): Promise<boolean> => {
  const id = receiptIdFor(operationId);
  const rows = await evolu.loadQuery(
    evolu.createQuery((db) =>
      db
        .selectFrom("receipt")
        .select("id")
        .where("id", "=", id)
        .where("isDeleted", "is not", sqliteTrue),
    ),
  );
  return rows.length > 0;
};

/** Records what a receive put into the wallet, once per receive. */
export const recordReceipt = async (
  evolu: AppEvolu,
  receipt: {
    readonly operationId: string;
    readonly kind: ReceiptKind;
    readonly sats: number;
    readonly paymentId?: PaymentRowId;
    readonly employeeId?: EmployeeId;
  },
  now = Date.now(),
): Promise<void> => {
  if (await hasReceipt(evolu, receipt.operationId)) return;
  await mutation((onComplete) =>
    evolu.upsert(
      "receipt",
      {
        id: receiptIdFor(receipt.operationId),
        kind: receipt.kind,
        sats: receipt.sats,
        receivedAtMs: now,
        paymentId: receipt.paymentId ?? null,
        employeeId: receipt.employeeId ?? null,
      },
      { onComplete },
    ),
  );
};
