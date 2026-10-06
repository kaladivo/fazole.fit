import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import { Sats } from "@platitprosim/core";
import type { AppEvolu } from "./evolu";
import { useAppEvolu } from "./evolu";

/** The wallet's spendable sats: every `available` proof, live as proofs change or sync in. */
export const useWalletBalance = (): Sats => {
  const evolu = useAppEvolu();
  const rows = useQuery(
    evolu.createQuery((db) =>
      db
        .selectFrom("cashuProof")
        .select(["amount", "unit", "state"])
        .where("isDeleted", "is not", sqliteTrue),
    ),
  );
  return Sats.make(
    rows.reduce(
      (total, row) =>
        row.state === "available" && row.unit === "sat"
          ? total + (row.amount ?? 0)
          : total,
      0,
    ),
  );
};

/** The available sat proofs at one mint: what a sweep can spend and how many inputs it pays fees on. */
export const loadAvailableProofs = async (
  evolu: AppEvolu,
  mint: string,
): Promise<{ readonly amount: number; readonly count: number }> => {
  const rows = (
    await evolu.loadQuery(
      evolu.createQuery((db) =>
        db
          .selectFrom("cashuProof")
          .select(["amount", "mint", "unit", "state"])
          .where("isDeleted", "is not", sqliteTrue),
      ),
    )
  ).filter(
    (row) =>
      row.mint === mint && row.unit === "sat" && row.state === "available",
  );
  return {
    amount: rows.reduce((total, row) => total + (row.amount ?? 0), 0),
    count: rows.length,
  };
};
