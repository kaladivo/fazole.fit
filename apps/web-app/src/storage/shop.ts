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
import { useStoredMembership } from "./membership";
import { RowChangedAtMs } from "./rows";
import { shopId } from "./schema";

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

/** The owner's shop, with when it last changed. */
export type OwnShop = ShopProfile & { readonly updatedAtMs: number };

const ShopRow = Schema.Struct({
  name: Schema.NonEmptyTrimmedString,
  iban: CzechIban,
  accountDisplay: Schema.NonEmptyTrimmedString,
  mintUrl: Schema.NullOr(Schema.NonEmptyTrimmedString),
  updatedAtMs: RowChangedAtMs,
});
const decodeShop = Schema.decodeUnknownOption(ShopRow);

export const shopQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("shop")
      .select(["name", "iban", "accountDisplay", "mintUrl"])
      .select((eb) => eb.fn.coalesce("updatedAt", "createdAt").as("changedAt"))
      .where("id", "=", shopId)
      .where("isDeleted", "is not", sqliteTrue),
  );

/** `null` until the install owns a shop or holds an active membership; the role routes the app. */
export const useShopProfile = (): ShopProfile | null => {
  const shop = toOwnShop(useQuery(shopQuery(useAppEvolu()))[0]);
  const membership = useStoredMembership();
  if (shop) return shop;
  if (membership && !membership.removed) {
    const { shopName, iban, accountDisplay, mintUrl } = membership;
    return { role: "employee", name: shopName, iban, accountDisplay, mintUrl };
  }
  return null;
};

const toOwnShop = (row: unknown): OwnShop | null =>
  Option.getOrNull(
    Option.map(decodeShop(row), ({ mintUrl, ...details }) => ({
      role: "owner" as const,
      ...details,
      mintUrl: mintUrl ?? appConfig.mintUrl,
    })),
  );

/** The owner's shop, `null` on an employee or a fresh install. */
export const loadOwnShop = async (evolu: AppEvolu): Promise<OwnShop | null> =>
  toOwnShop((await evolu.loadQuery(shopQuery(evolu)))[0]);

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
