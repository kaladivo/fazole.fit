import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import { Sats } from "@platitprosim/core";
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
