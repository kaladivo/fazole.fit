import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { CzkAmount } from "./money";
import { PaymentId } from "./payment";
import {
  type AppMessage,
  decodeAppMessage,
  encodeAppMessage,
  type PaymentRecord,
} from "./protocol";
import { VariableSymbol } from "./variableSymbol";

const ownerPubkey =
  "17162c921dc4d2518f9a101db33695df1afb56ab82f5ff3e5da6eec3ca5cd917";

const shopConfig = {
  v: 1,
  type: "ShopConfig",
  shopId: "shop-1",
  shopName: "Kavárna U Lípy",
  iban: "CZ6508000000192000145399",
  accountDisplay: "19-2000145399/0800",
  ownerPubkey,
  mintUrl: "https://cashu.cz",
  employeeName: "Jana",
  updatedAt: 1_760_000_000_000,
};

const paymentRecord: PaymentRecord = {
  v: 1,
  type: "PaymentRecord",
  paymentId: PaymentId.make("pay-1"),
  amountCzk: CzkAmount.make(12_050),
  method: "bank",
  status: "paid",
  vs: VariableSymbol.make("1234567890"),
  createdAt: 1_760_000_000_000,
  updatedAt: 1_760_000_060_000,
  paidAt: 1_760_000_060_000,
};

const decode = (value: unknown) => decodeAppMessage(JSON.stringify(value));

describe("app messages", () => {
  it.each<AppMessage>([
    paymentRecord,
    { v: 1, type: "EmployeeRemoved", shopId: "shop-1" },
    {
      v: 1,
      type: "LockedToken",
      paymentIds: [PaymentId.make("pay-1"), PaymentId.make("pay-2")],
      token: "cashuBo2F0gaJhaUgA",
    },
  ])("round-trips $type", (message) => {
    expect(
      Either.getOrThrow(decodeAppMessage(encodeAppMessage(message))),
    ).toEqual(message);
  });

  it("decodes a ShopConfig", () => {
    expect(Either.getOrThrow(decode(shopConfig))).toEqual(shopConfig);
  });

  it.each([
    ["not JSON", "{"],
    ["unknown type", JSON.stringify({ v: 1, type: "Hello" })],
    ["unknown version", JSON.stringify({ ...shopConfig, v: 2 })],
    [
      "invalid IBAN",
      JSON.stringify({ ...shopConfig, iban: "CZ6608000000192000145399" }),
    ],
    ["invalid pubkey", JSON.stringify({ ...shopConfig, ownerPubkey: "abc" })],
    [
      "ShopConfig without updatedAt",
      JSON.stringify({ ...shopConfig, updatedAt: undefined }),
    ],
    ["fractional haléře", JSON.stringify({ ...paymentRecord, amountCzk: 1.5 })],
    [
      "unknown status",
      JSON.stringify({ ...paymentRecord, status: "refunded" }),
    ],
    ["VS with leading zero", JSON.stringify({ ...paymentRecord, vs: "0123" })],
    [
      "missing field",
      JSON.stringify({ v: 1, type: "LockedToken", paymentIds: ["p"] }),
    ],
  ])("rejects %s", (_name, json) => {
    expect(Either.isLeft(decodeAppMessage(json))).toBe(true);
  });
});
