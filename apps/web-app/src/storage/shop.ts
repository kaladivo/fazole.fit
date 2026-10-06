import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import {
  CzechIban,
  czechAccountToIban,
  formatCzechAccount,
} from "@platitprosim/core";
import type { CzechAccount } from "@platitprosim/core";
import { Option, Schema } from "effect";
import type { AppEvolu } from "./evolu";
import { mutation, useAppEvolu } from "./evolu";
import { membershipId, shopId } from "./schema";

export type Role = "owner" | "employee";

/** The shop this install takes payments for: its own (owner) or the one it works for (employee). */
export interface ShopProfile {
  readonly role: Role;
  readonly name: string;
  readonly iban: CzechIban;
  readonly accountDisplay: string;
}

const ShopRow = Schema.Struct({
  name: Schema.NonEmptyTrimmedString,
  iban: CzechIban,
  accountDisplay: Schema.NonEmptyTrimmedString,
});
const decodeShop = Schema.decodeUnknownOption(ShopRow);

const MembershipRow = Schema.Struct({
  shopName: Schema.NonEmptyTrimmedString,
  iban: CzechIban,
  accountDisplay: Schema.NonEmptyTrimmedString,
  removedAtMs: Schema.Null,
});
const decodeMembership = Schema.decodeUnknownOption(MembershipRow);

const shopQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("shop")
      .select(["name", "iban", "accountDisplay"])
      .where("id", "=", shopId)
      .where("isDeleted", "is not", sqliteTrue),
  );

const membershipQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("membership")
      .select(["shopName", "iban", "accountDisplay", "removedAtMs"])
      .where("id", "=", membershipId)
      .where("isDeleted", "is not", sqliteTrue),
  );

/** `null` until the install owns a shop or holds an active membership; the role routes the app. */
export const useShopProfile = (): ShopProfile | null => {
  const evolu = useAppEvolu();
  const shop = decodeShop(useQuery(shopQuery(evolu))[0]);
  const membership = decodeMembership(useQuery(membershipQuery(evolu))[0]);
  if (Option.isSome(shop)) return { role: "owner", ...shop.value };
  if (Option.isSome(membership)) {
    const { shopName, iban, accountDisplay } = membership.value;
    return { role: "employee", name: shopName, iban, accountDisplay };
  }
  return null;
};

export interface ShopDetails {
  readonly name: string;
  readonly account: CzechAccount;
}

export const saveShop = (evolu: AppEvolu, { name, account }: ShopDetails) =>
  mutation((onComplete) =>
    evolu.upsert(
      "shop",
      {
        id: shopId,
        name: name.trim(),
        iban: czechAccountToIban(account),
        accountDisplay: formatCzechAccount(account),
      },
      { onComplete },
    ),
  );
