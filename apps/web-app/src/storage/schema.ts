import {
  createIdFromString,
  id,
  NonEmptyString,
  NonEmptyString100,
  NonEmptyString1000,
  NonNegativeInt,
  nullOr,
  PositiveInt,
  PositiveNumber,
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
export const WithdrawalId = id("Withdrawal");
export type WithdrawalId = InferType<typeof WithdrawalId>;
export const EmployeeDeviceId = id("EmployeeDevice");
export type EmployeeDeviceId = InferType<typeof EmployeeDeviceId>;
export const EmployeeLoginId = id("EmployeeLogin");
export type EmployeeLoginId = InferType<typeof EmployeeLoginId>;
export const ShopOfferId = id("ShopOffer");
export type ShopOfferId = InferType<typeof ShopOfferId>;

/** One install owns at most one shop and holds at most one membership, so every device converges on one row. */
export const shopId = createIdFromString<"Shop">("shop");
export const membershipId = createIdFromString<"Membership">("membership");
export const employeeLoginId =
  createIdFromString<"EmployeeLogin">("employeeLogin");
export const employeeIdFor = (pubkey: string) =>
  createIdFromString<"Employee">(`employee/${pubkey}`);
export const employeeDeviceIdFor = (pubkey: string) =>
  createIdFromString<"EmployeeDevice">(`employeeDevice/${pubkey}`);
export const shopOfferIdFor = (ownerPubkey: string) =>
  createIdFromString<"ShopOffer">(`shopOffer/${ownerPubkey}`);
/** An employee payment on the owner: one row per sending device and payment, however often it is reported. */
export const reportedPaymentIdFor = (device: string, paymentId: string) =>
  createIdFromString<"Payment">(`payment/${device}/${paymentId}`);
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
    // The applied config's `updatedAt`; an older or equal config is a replay.
    configUpdatedAtMs: nullOr(PositiveInt),
    // Set by `EmployeeRemoved`; configs from this owner are ignored from then on.
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
  /** Owner install: an employee device whose Linky attestation checked out. */
  employeeDevice: {
    id: EmployeeDeviceId,
    employeeId: EmployeeId,
    // Hex pubkey of the device; its `PaymentRecord`s are trusted.
    pubkey: NonEmptyString100,
    linkedAtMs: PositiveInt,
    // The `ShopConfig` JSON last queued to it, so a changed shop is resent.
    configSent: nullOr(NonEmptyString),
    // Its employee was removed: the device is never trusted again, also once they are re-added.
    revokedAtMs: nullOr(PositiveInt),
  },
  /** Employee install: the Linky login waiting for an owner to add it. */
  employeeLogin: {
    id: EmployeeLoginId,
    // Hex pubkey of the employee's Linky identity.
    employeePubkey: NonEmptyString100,
    // The signed kind 24138 device authorization, as JSON.
    attestation: NonEmptyString,
    createdAtMs: PositiveInt,
  },
  /** Employee install: a `ShopConfig` the employee has not answered yet. */
  shopOffer: {
    id: ShopOfferId,
    ownerPubkey: NonEmptyString100,
    // The `ShopConfig` JSON.
    config: NonEmptyString,
    receivedAtMs: PositiveInt,
    // The employee declined, or the owner removed them; further configs from this owner are ignored.
    declinedAtMs: nullOr(PositiveInt),
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
    // The rate the sats were priced at.
    czkPerBtc: nullOr(PositiveNumber),
    // Employee: the P2PK token for the owner, kept until it is delivered.
    lockedToken: nullOr(NonEmptyString),
    // Employee: the linkshu send holding that token.
    forwardOperationId: nullOr(NonEmptyString1000),
    // Employee: when the token reached a relay. Owner: when it was received.
    forwardedAtMs: nullOr(PositiveInt),
    // Employee: the `updatedAtMs` last queued to the owner as a `PaymentRecord`.
    reportedAtMs: nullOr(PositiveInt),
  },
  /** Owner install: money taken out of the wallet. */
  withdrawal: {
    id: WithdrawalId,
    // "lightning" | "linky"
    kind: NonEmptyString100,
    // The Lightning address or invoice, or the Linky npub.
    target: NonEmptyString,
    amountSats: PositiveInt,
    // The Lightning fee actually paid.
    feeSats: nullOr(NonNegativeInt),
    // "pending" | "done" | "failed"
    status: NonEmptyString100,
    createdAtMs: PositiveInt,
    completedAtMs: nullOr(PositiveInt),
    // Lightning: the melt quote, settled by `Melt.resumePending` after a reload.
    quoteId: nullOr(NonEmptyString1000),
    // Linky: the linkshu send, returned to the wallet if delivery fails.
    operationId: nullOr(NonEmptyString1000),
    error: nullOr(NonEmptyString1000),
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
