import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import { Pubkey } from "@linky-fit/linkstr";
import { ShopConfig } from "@platitprosim/core";
import { Option, Schema } from "effect";
import type { AppEvolu } from "./evolu";
import { mutation, useAppEvolu } from "./evolu";
import { employeeLoginId, membershipId, shopOfferIdFor } from "./schema";
import type { ShopOfferId } from "./schema";

/** Employee install: the Linky identity this device acts for, waiting for or holding a membership. */
export interface EmployeeLogin {
  readonly employeePubkey: Pubkey;
  /** The signed device authorization JSON, published for owners to find. */
  readonly attestation: string;
}

const LoginRow = Schema.Struct({
  employeePubkey: Pubkey,
  attestation: Schema.NonEmptyString,
});
const decodeLogin = Schema.decodeUnknownOption(LoginRow);

export interface ShopOffer {
  readonly id: ShopOfferId;
  readonly ownerPubkey: Pubkey;
  readonly config: ShopConfig;
  readonly declined: boolean;
}

const ShopConfigJson = Schema.parseJson(ShopConfig);
const decodeOffer = Schema.decodeUnknownOption(
  Schema.Struct({
    ownerPubkey: Pubkey,
    config: ShopConfigJson,
    declinedAtMs: Schema.NullOr(Schema.Int),
  }),
);
const encodeConfig = Schema.encodeSync(ShopConfigJson);

/** The membership as stored, removed or not. */
export interface StoredMembership {
  readonly shopName: string;
  readonly ownerPubkey: Pubkey;
  readonly mintUrl: string;
  readonly employeeName: string | null;
  readonly employeePubkey: Pubkey | null;
  readonly removed: boolean;
}

const decodeMembership = Schema.decodeUnknownOption(
  Schema.Struct({
    shopName: Schema.NonEmptyString,
    ownerPubkey: Pubkey,
    mintUrl: Schema.NonEmptyString,
    employeeName: Schema.NullOr(Schema.String),
    employeePubkey: Schema.NullOr(Pubkey),
    removedAtMs: Schema.NullOr(Schema.Int),
  }),
);

const loginQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("employeeLogin")
      .select(["employeePubkey", "attestation"])
      .where("id", "=", employeeLoginId)
      .where("isDeleted", "is not", sqliteTrue),
  );

const offersQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("shopOffer")
      .select(["id", "ownerPubkey", "config", "declinedAtMs"])
      .where("isDeleted", "is not", sqliteTrue)
      .orderBy("receivedAtMs", "desc"),
  );

export const membershipRowQuery = (evolu: AppEvolu) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("membership")
      .select([
        "shopName",
        "ownerPubkey",
        "mintUrl",
        "employeeName",
        "employeePubkey",
        "removedAtMs",
      ])
      .where("id", "=", membershipId)
      .where("isDeleted", "is not", sqliteTrue),
  );

const toLogin = (row: unknown): EmployeeLogin | null =>
  Option.getOrNull(decodeLogin(row));

const toOffers = (
  rows: ReadonlyArray<{ readonly id: ShopOfferId } & Record<string, unknown>>,
): ShopOffer[] =>
  rows.flatMap((row) =>
    Option.toArray(
      Option.map(decodeOffer(row), ({ ownerPubkey, config, declinedAtMs }) => ({
        id: row.id,
        ownerPubkey,
        config,
        declined: declinedAtMs !== null,
      })),
    ),
  );

export const toStoredMembership = (row: unknown): StoredMembership | null =>
  Option.getOrNull(
    Option.map(decodeMembership(row), ({ removedAtMs, ...membership }) => ({
      ...membership,
      removed: removedAtMs !== null,
    })),
  );

export const useEmployeeLogin = (): EmployeeLogin | null =>
  toLogin(useQuery(loginQuery(useAppEvolu()))[0]);

export const loadEmployeeLogin = async (
  evolu: AppEvolu,
): Promise<EmployeeLogin | null> =>
  toLogin((await evolu.loadQuery(loginQuery(evolu)))[0]);

export const useShopOffers = (): ShopOffer[] =>
  toOffers(useQuery(offersQuery(useAppEvolu())));

export const loadShopOffers = async (evolu: AppEvolu): Promise<ShopOffer[]> =>
  toOffers(await evolu.loadQuery(offersQuery(evolu)));

export const useStoredMembership = (): StoredMembership | null =>
  toStoredMembership(useQuery(membershipRowQuery(useAppEvolu()))[0]);

export const loadStoredMembership = async (
  evolu: AppEvolu,
): Promise<StoredMembership | null> =>
  toStoredMembership((await evolu.loadQuery(membershipRowQuery(evolu)))[0]);

export const saveEmployeeLogin = (
  evolu: AppEvolu,
  login: EmployeeLogin,
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.upsert(
      "employeeLogin",
      { id: employeeLoginId, ...login, createdAtMs: now },
      { onComplete },
    ),
  );

/** Forgets the login and every offer, back to the login screen. */
export const cancelEmployeeLogin = async (evolu: AppEvolu) => {
  const offers = await loadShopOffers(evolu);
  await Promise.all([
    mutation((onComplete) =>
      evolu.update(
        "employeeLogin",
        { id: employeeLoginId, isDeleted: sqliteTrue },
        { onComplete },
      ),
    ),
    ...offers.map((offer) => dropShopOffer(evolu, offer.id)),
  ]);
};

/** Keeps the newest config of an owner until the employee answers it. */
export const saveShopOffer = (
  evolu: AppEvolu,
  ownerPubkey: Pubkey,
  config: ShopConfig,
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.upsert(
      "shopOffer",
      {
        id: shopOfferIdFor(ownerPubkey),
        ownerPubkey,
        config: encodeConfig(config),
        receivedAtMs: now,
        declinedAtMs: null,
      },
      { onComplete },
    ),
  );

export const declineShopOffer = (
  evolu: AppEvolu,
  id: ShopOfferId,
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.update("shopOffer", { id, declinedAtMs: now }, { onComplete }),
  );

export const dropShopOffer = (evolu: AppEvolu, id: ShopOfferId) =>
  mutation((onComplete) =>
    evolu.update("shopOffer", { id, isDeleted: sqliteTrue }, { onComplete }),
  );

/** Stores the shop the device now works for; an existing membership is updated in place. */
export const saveMembership = (
  evolu: AppEvolu,
  config: ShopConfig,
  employeePubkey: Pubkey | null,
  now = Date.now(),
) =>
  mutation((onComplete) =>
    evolu.upsert(
      "membership",
      {
        id: membershipId,
        shopId: config.shopId.slice(0, 100),
        shopName: config.shopName.slice(0, 100),
        iban: config.iban,
        accountDisplay: config.accountDisplay.slice(0, 100),
        ownerPubkey: config.ownerPubkey,
        mintUrl: config.mintUrl,
        employeeName:
          config.employeeName.trim() === ""
            ? null
            : config.employeeName.trim().slice(0, 100),
        employeePubkey,
        receivedAtMs: now,
        removedAtMs: null,
      },
      { onComplete },
    ),
  );

/** Joins the offered shop: the membership replaces every pending offer. */
export const acceptShopOffer = async (
  evolu: AppEvolu,
  offer: ShopOffer,
  employeePubkey: Pubkey | null,
) => {
  await saveMembership(evolu, offer.config, employeePubkey);
  const offers = await loadShopOffers(evolu);
  await Promise.all(offers.map((stored) => dropShopOffer(evolu, stored.id)));
};

export const markMembershipRemoved = (evolu: AppEvolu, now = Date.now()) =>
  mutation((onComplete) =>
    evolu.update(
      "membership",
      { id: membershipId, removedAtMs: now },
      { onComplete },
    ),
  );
