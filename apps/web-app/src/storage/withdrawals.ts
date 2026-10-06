import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import { Schema } from "effect";
import type { AppEvolu } from "./evolu";
import { mutation, useAppEvolu } from "./evolu";
import { decodeRows } from "./rows";
import type { WithdrawalId } from "./schema";

export const WithdrawalKind = Schema.Literal("lightning", "linky");
export type WithdrawalKind = typeof WithdrawalKind.Type;

export const WithdrawalStatus = Schema.Literal("pending", "done", "failed");
export type WithdrawalStatus = typeof WithdrawalStatus.Type;

const WithdrawalFields = Schema.Struct({
  kind: WithdrawalKind,
  target: Schema.String,
  amountSats: Schema.Int,
  feeSats: Schema.NullOr(Schema.Int),
  status: WithdrawalStatus,
  createdAtMs: Schema.Int,
  completedAtMs: Schema.NullOr(Schema.Int),
  quoteId: Schema.NullOr(Schema.String),
  operationId: Schema.NullOr(Schema.String),
  error: Schema.NullOr(Schema.String),
});
const decodeWithdrawal = Schema.decodeUnknownOption(WithdrawalFields);

export type Withdrawal = typeof WithdrawalFields.Type & {
  readonly id: WithdrawalId;
};

const withdrawalsQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("withdrawal")
      .selectAll()
      .where("isDeleted", "is not", sqliteTrue)
      .orderBy("createdAtMs", "desc"),
  );

const toWithdrawals = decodeRows<typeof WithdrawalFields.Type, WithdrawalId>(
  decodeWithdrawal,
);

/** Newest first. */
export const useWithdrawals = (): Withdrawal[] =>
  toWithdrawals(useQuery(withdrawalsQuery(useAppEvolu())));

export const loadWithdrawals = async (evolu: AppEvolu): Promise<Withdrawal[]> =>
  toWithdrawals(await evolu.loadQuery(withdrawalsQuery(evolu)));

export const createWithdrawal = (
  evolu: AppEvolu,
  withdrawal: {
    readonly kind: WithdrawalKind;
    readonly target: string;
    readonly amountSats: number;
    readonly quoteId?: string;
    readonly operationId?: string;
  },
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.insert(
      "withdrawal",
      { ...withdrawal, status: "pending", createdAtMs: now },
      { onComplete },
    ),
  );

/** Links a Linky withdrawal to the linkshu send holding its token. */
export const attachWithdrawalSend = (
  evolu: AppEvolu,
  id: WithdrawalId,
  operationId: string,
) =>
  mutation((onComplete) =>
    evolu.update("withdrawal", { id, operationId }, { onComplete }),
  );

/** Closes a pending withdrawal; one that already ended is left alone. */
export const finishWithdrawal = async (
  evolu: AppEvolu,
  id: WithdrawalId,
  outcome:
    | { readonly status: "done"; readonly feeSats?: number }
    | { readonly status: "failed"; readonly error: string },
  now = Date.now(),
): Promise<void> => {
  const current = (await loadWithdrawals(evolu)).find(
    (withdrawal) => withdrawal.id === id,
  );
  if (current?.status !== "pending") return;
  await mutation((onComplete) =>
    evolu.update(
      "withdrawal",
      {
        id,
        status: outcome.status,
        completedAtMs: now,
        ...(outcome.status === "done"
          ? outcome.feeSats === undefined
            ? {}
            : { feeSats: outcome.feeSats }
          : { error: outcome.error.slice(0, 1000) }),
      },
      { onComplete },
    ),
  );
};
