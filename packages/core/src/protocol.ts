import { appMessageChannel, AppNamespace, Pubkey } from "@linky-fit/linkstr";
import { Schema } from "effect";
import { CzechIban } from "./czechAccount";
import { CzkAmount, Sats } from "./money";
import { PaymentId, PaymentMethod, PaymentStatus } from "./payment";
import { VariableSymbol } from "./variableSymbol";

const appMessage = <Type extends string, Fields extends Schema.Struct.Fields>(
  type: Type,
  fields: Fields,
) =>
  Schema.Struct({
    v: Schema.Literal(1),
    type: Schema.Literal(type),
    ...fields,
  });

const UnixMillis = Schema.Int.pipe(Schema.nonNegative());
const HttpUrl = Schema.String.pipe(Schema.pattern(/^https?:\/\/\S+$/));
const optional = <S extends Schema.Schema.Any>(schema: S) =>
  Schema.optionalWith(schema, { exact: true });

export const ShopConfig = appMessage("ShopConfig", {
  shopId: Schema.NonEmptyTrimmedString,
  shopName: Schema.NonEmptyTrimmedString,
  iban: CzechIban,
  accountDisplay: Schema.NonEmptyTrimmedString,
  ownerPubkey: Pubkey,
  mintUrl: HttpUrl,
  employeeName: Schema.String,
});
export type ShopConfig = typeof ShopConfig.Type;

export const EmployeeRemoved = appMessage("EmployeeRemoved", {
  shopId: Schema.NonEmptyTrimmedString,
});
export type EmployeeRemoved = typeof EmployeeRemoved.Type;

export const PaymentRecord = appMessage("PaymentRecord", {
  paymentId: PaymentId,
  amountCzk: CzkAmount,
  sats: optional(Sats),
  method: PaymentMethod,
  status: PaymentStatus,
  vs: optional(VariableSymbol),
  createdAt: UnixMillis,
  updatedAt: UnixMillis,
  paidAt: optional(UnixMillis),
});
export type PaymentRecord = typeof PaymentRecord.Type;

export const LockedToken = appMessage("LockedToken", {
  paymentId: PaymentId,
  token: Schema.String.pipe(Schema.startsWith("cashu")),
});
export type LockedToken = typeof LockedToken.Type;

export const AppMessage = Schema.Union(
  ShopConfig,
  EmployeeRemoved,
  PaymentRecord,
  LockedToken,
);
export type AppMessage = typeof AppMessage.Type;

const AppMessageJson = Schema.parseJson(AppMessage);

export const decodeAppMessage = Schema.decodeUnknownEither(AppMessageJson);
export const encodeAppMessage = Schema.encodeSync(AppMessageJson);

/** The app's gift-wrapped message channel: `draft` to send a message, `decode` an `AppMessageReceived`. */
export const appMessages = appMessageChannel(
  AppNamespace.make("platitprosim"),
  AppMessage,
);
