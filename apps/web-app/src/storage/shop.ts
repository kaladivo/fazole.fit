import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import {
  CzechIban,
  czechAccountToIban,
  formatCzechAccount,
} from "@platitprosim/core";
import type { CzechAccount } from "@platitprosim/core";
import { Option, Schema } from "effect";
import { appConfig } from "../config";
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
  /** The Cashu mint payments are received at. */
  readonly mintUrl: string;
}

const ShopRow = Schema.Struct({
  name: Schema.NonEmptyTrimmedString,
  iban: CzechIban,
  accountDisplay: Schema.NonEmptyTrimmedString,
  mintUrl: Schema.NullOr(Schema.NonEmptyTrimmedString),
});
const decodeShop = Schema.decodeUnknownOption(ShopRow);

const MembershipRow = Schema.Struct({
  shopName: Schema.NonEmptyTrimmedString,
  iban: CzechIban,
  accountDisplay: Schema.NonEmptyTrimmedString,
  mintUrl: Schema.NonEmptyTrimmedString,
  removedAtMs: Schema.Null,
});
const decodeMembership = Schema.decodeUnknownOption(MembershipRow);

export const shopQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("shop")
      .select(["name", "iban", "accountDisplay", "mintUrl"])
      .where("id", "=", shopId)
      .where("isDeleted", "is not", sqliteTrue),
  );

const membershipQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("membership")
      .select(["shopName", "iban", "accountDisplay", "mintUrl", "removedAtMs"])
      .where("id", "=", membershipId)
      .where("isDeleted", "is not", sqliteTrue),
  );

/** `null` until the install owns a shop or holds an active membership; the role routes the app. */
export const useShopProfile = (): ShopProfile | null => {
  const evolu = useAppEvolu();
  const shop = toOwnerProfile(useQuery(shopQuery(evolu))[0]);
  const membership = decodeMembership(useQuery(membershipQuery(evolu))[0]);
  if (shop) return shop;
  if (Option.isSome(membership)) {
    const { shopName, iban, accountDisplay, mintUrl } = membership.value;
    return { role: "employee", name: shopName, iban, accountDisplay, mintUrl };
  }
  return null;
};

const toOwnerProfile = (row: unknown): ShopProfile | null =>
  Option.getOrNull(
    Option.map(decodeShop(row), ({ mintUrl, ...details }) => ({
      role: "owner" as const,
      ...details,
      mintUrl: mintUrl ?? appConfig.mintUrl,
    })),
  );

/** The owner's shop, `null` on an employee or a fresh install. */
export const loadOwnShop = async (
  evolu: AppEvolu,
): Promise<ShopProfile | null> =>
  toOwnerProfile((await evolu.loadQuery(shopQuery(evolu)))[0]);

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
