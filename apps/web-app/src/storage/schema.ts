import {
  createIdFromString,
  id,
  NonEmptyString,
  NonEmptyString100,
  NonEmptyString1000,
  NonNegativeInt,
  nullOr,
  PositiveInt,
  SqliteBoolean,
  String,
} from "@evolu/common";
import type { EvoluSchema, InferType } from "@evolu/common";

export const ShopId = id("Shop");
export type ShopId = InferType<typeof ShopId>;
export const MembershipId = id("Membership");
export type MembershipId = InferType<typeof MembershipId>;
export const EmployeeId = id("Employee");
export type EmployeeId = InferType<typeof EmployeeId>;
export const PaymentRowId = id("Payment");
export type PaymentRowId = InferType<typeof PaymentRowId>;
export const SettingId = id("Setting");
export type SettingId = InferType<typeof SettingId>;
export const CashuKeyValueId = id("CashuKeyValue");
export type CashuKeyValueId = InferType<typeof CashuKeyValueId>;
export const CashuProofId = id("CashuProof");
export type CashuProofId = InferType<typeof CashuProofId>;
export const CashuOperationId = id("CashuOperation");
export type CashuOperationId = InferType<typeof CashuOperationId>;
export const OutboxJobRowId = id("OutboxJob");
export type OutboxJobRowId = InferType<typeof OutboxJobRowId>;
export const InboxCursorId = id("InboxCursor");
export type InboxCursorId = InferType<typeof InboxCursorId>;

/** One install owns at most one shop and holds at most one membership, so every device converges on one row. */
export const shopId = createIdFromString<"Shop">("shop");
export const membershipId = createIdFromString<"Membership">("membership");
export const employeeIdFor = (pubkey: string) =>
  createIdFromString<"Employee">(`employee/${pubkey}`);
export const settingIdFor = (key: string) =>
  createIdFromString<"Setting">(`setting/${key}`);
export const cashuKeyValueIdFor = (key: string) =>
  createIdFromString<"CashuKeyValue">(`cashuKeyValue/${key}`);
/** The same derivation as linky, so a proof synced or restored twice stays one row. */
export const cashuProofIdFor = (secret: string) =>
  createIdFromString<"CashuProof">(secret);
/** Hashes linkshu's `operationKeyOf`. */
export const cashuOperationIdFor = (operationKey: string) =>
  createIdFromString<"CashuOperation">(operationKey);
export const outboxJobIdFor = (jobId: string) =>
  createIdFromString<"OutboxJob">(`outboxJob/${jobId}`);
export const inboxCursorIdFor = (pubkey: string) =>
  createIdFromString<"InboxCursor">(`inboxCursor/${pubkey}`);

/**
 * The synced data of one install. Evolu adds `createdAt`, `updatedAt`,
 * `isDeleted` and `ownerId`; event times are separate `…AtMs` columns so a
 * later update never moves them. A row can arrive column by column from sync,
 * so readers validate what they need.
 */
export const AppSchema = {
  /** Owner install: the shop this device takes payments for. */
  shop: {
    id: ShopId,
    name: NonEmptyString100,
    // Compact uppercase Czech IBAN.
    iban: NonEmptyString100,
    // `[prefix-]number/bankCode` as the owner typed it, normalised.
    accountDisplay: NonEmptyString100,
    // The shop mint; null means the app default.
    mintUrl: nullOr(NonEmptyString1000),
  },
  /** Employee install: the `ShopConfig` the owner sent. */
  membership: {
    id: MembershipId,
    shopId: NonEmptyString100,
    shopName: NonEmptyString100,
    iban: NonEmptyString100,
    accountDisplay: NonEmptyString100,
    // Hex pubkey of the owner's device; tokens are P2PK-locked to it.
    ownerPubkey: NonEmptyString100,
    mintUrl: NonEmptyString1000,
    employeeName: nullOr(NonEmptyString100),
    // Hex pubkey of the employee's Linky identity.
    employeePubkey: nullOr(NonEmptyString100),
    receivedAtMs: PositiveInt,
    // Set by `EmployeeRemoved`.
    removedAtMs: nullOr(PositiveInt),
  },
  /** Owner install: the people allowed to take payments for the shop. */
  employee: {
    id: EmployeeId,
    // Hex pubkey of the employee's Linky identity.
    pubkey: NonEmptyString100,
    name: nullOr(NonEmptyString100),
    addedAtMs: PositiveInt,
    removedAtMs: nullOr(PositiveInt),
  },
  /** The payment history: this device's payments and, on the owner, every employee's. */
  payment: {
    id: PaymentRowId,
    // Haléře.
    amountCzk: PositiveInt,
    sats: nullOr(PositiveInt),
    // "bank" | "lightning" | "cashu"
    method: NonEmptyString100,
    // "pending" | "paid" | "cancelled"
    status: NonEmptyString100,
    // Variable symbol of a bank payment.
    vs: nullOr(NonEmptyString100),
    createdAtMs: PositiveInt,
    updatedAtMs: PositiveInt,
    paidAtMs: nullOr(PositiveInt),
    // Hex pubkey of the device that created the payment.
    createdBy: NonEmptyString100,
    // On the owner: the employee whose device created it.
    employeeId: nullOr(EmployeeId),
    // Lightning: the mint quote and its invoice.
    quoteId: nullOr(NonEmptyString1000),
    invoice: nullOr(NonEmptyString),
    // NUT-18 `creqA…` the customer can pay with Cashu.
    paymentRequest: nullOr(NonEmptyString),
    // Employee: the P2PK token for the owner, kept until it is delivered.
    lockedToken: nullOr(NonEmptyString),
    forwardedAtMs: nullOr(PositiveInt),
  },
  /** Small synced key/value state: language, theme. */
  setting: {
    id: SettingId,
    key: NonEmptyString100,
    value: NonEmptyString1000,
  },
  /** linkshu `KeyValueStore`: counters, restore cursors, seen mints. */
  cashuKeyValue: {
    id: CashuKeyValueId,
    key: NonEmptyString1000,
    value: String,
  },
  /** linkshu `ProofStore`: the wallet inventory, one row per proof. */
  cashuProof: {
    id: CashuProofId,
    mint: NonEmptyString1000,
    unit: NonEmptyString100,
    keysetId: NonEmptyString100,
    amount: PositiveInt,
    secret: NonEmptyString1000,
    // The NUT-00 signature point `C`.
    c: NonEmptyString1000,
    // JSON of the NUT-12 DLEQ proof.
    dleq: nullOr(NonEmptyString1000),
    // "available" | "held" | "handedOut" | "externalized" | "spent"
    state: NonEmptyString100,
    operationId: nullOr(CashuOperationId),
  },
  /** linkshu `OperationStore`: melts, topups, sends, receives. */
  cashuOperation: {
    id: CashuOperationId,
    kind: NonEmptyString100,
    status: NonEmptyString100,
    mint: NonEmptyString1000,
    unit: NonEmptyString100,
    keysetId: nullOr(NonEmptyString100),
    amount: PositiveInt,
    feeReserve: nullOr(NonNegativeInt),
    inputsTotal: nullOr(PositiveInt),
    quoteId: nullOr(NonEmptyString1000),
    invoice: nullOr(NonEmptyString),
    sourceMint: nullOr(NonEmptyString1000),
    counter: nullOr(NonNegativeInt),
    locked: nullOr(SqliteBoolean),
    expiresAtSec: nullOr(PositiveInt),
    createdAtSec: PositiveInt,
    tokenText: nullOr(NonEmptyString),
    error: nullOr(NonEmptyString1000),
  },
  /** linkstr `OutboxStore`: queued Nostr sends. */
  outboxJob: {
    id: OutboxJobRowId,
    jobId: NonEmptyString1000,
    // The encoded `StoredOutboxJob`.
    job: NonEmptyString,
    // Insertion order.
    position: PositiveInt,
  },
  /** linkstr `InboxCursorStore`: the wrap inbox backfill cursor per identity. */
  inboxCursor: {
    id: InboxCursorId,
    pubkey: NonEmptyString100,
    cursorSec: NonNegativeInt,
  },
} satisfies EvoluSchema;

export type AppSchema = typeof AppSchema;
