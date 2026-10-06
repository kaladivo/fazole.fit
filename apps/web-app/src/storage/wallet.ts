import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import { Sats } from "@platitprosim/core";
import type { AppEvolu } from "./evolu";
import { useAppEvolu } from "./evolu";
import { needsForward, usePayments } from "./payments";

const proofsQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("cashuProof")
      .select(["amount", "mint", "unit", "state"])
      .where("isDeleted", "is not", sqliteTrue),
  );

type ProofRow = {
  readonly amount: number | null;
  readonly mint: string | null;
  readonly unit: string | null;
  readonly state: string | null;
};

const availableSats = (rows: readonly ProofRow[]) =>
  rows.filter((row) => row.state === "available" && row.unit === "sat");

const total = (rows: readonly ProofRow[]) =>
  rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);

/** The wallet's spendable sats: every `available` proof, live as proofs change or sync in. */
export const useWalletBalance = (): Sats =>
  Sats.make(total(availableSats(useQuery(proofsQuery(useAppEvolu())))));

export const loadWalletBalance = async (evolu: AppEvolu): Promise<Sats> =>
  Sats.make(total(availableSats(await evolu.loadQuery(proofsQuery(evolu)))));

/** The mints holding spendable sats. */
export const loadFundedMints = async (
  evolu: AppEvolu,
): Promise<readonly string[]> => [
  ...new Set(
    availableSats(await evolu.loadQuery(proofsQuery(evolu))).flatMap((row) =>
      row.mint !== null && (row.amount ?? 0) > 0 ? [row.mint] : [],
    ),
  ),
];

/** The available sat proofs at one mint: what a sweep can spend and how many inputs it pays fees on. */
export const loadAvailableProofs = async (
  evolu: AppEvolu,
  mint: string,
): Promise<{ readonly amount: number; readonly count: number }> => {
  const rows = availableSats(await evolu.loadQuery(proofsQuery(evolu))).filter(
    (row) => row.mint === mint,
  );
  return { amount: total(rows), count: rows.length };
};

/**
 * Employee: the device still holds shop money, so leaving or resetting it
 * would strand it: sats in the wallet, a forward on its way, or a payment
 * not forwarded yet.
 */
export const useHoldsShopFunds = (): boolean => {
  const evolu = useAppEvolu();
  const sending = useQuery(
    evolu.createQuery((db) =>
      db
        .selectFrom("cashuOperation")
        .select(["kind", "status"])
        .where("isDeleted", "is not", sqliteTrue),
    ),
  ).some(({ kind, status }) => kind === "send" && status === "pending");
  const balance = useWalletBalance();
  const payments = usePayments();
  return balance > 0 || sending || payments.some(needsForward);
};
