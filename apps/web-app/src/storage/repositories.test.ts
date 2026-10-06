import { sqliteTrue } from "@evolu/common";
import { parsePubkey } from "@linky-fit/linkstr";
import { CzkAmount, parseCzechAccount } from "@platitprosim/core";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { loadIdentity, parseMnemonic } from "./identity";
import {
  changePaymentStatus,
  createBankPayment,
  loadPayments,
} from "./payments";
import { shopId } from "./schema";
import { saveSetting } from "./settings";
import { saveShop } from "./shop";
import { createTestEvolu } from "./testing/testEvolu";

const device = parsePubkey("a".repeat(64));
if (device === null) throw new Error("bad test pubkey");

const createPayment = (
  evolu: ReturnType<typeof createTestEvolu>,
  amount: number,
  now: number,
) =>
  createBankPayment(
    evolu,
    { amountCzk: CzkAmount.make(amount), createdBy: device },
    now,
  );

describe("identity", () => {
  it("derives the device keys from Evolu's AppOwner mnemonic", async () => {
    const evolu = createTestEvolu();
    const identity = await loadIdentity(evolu);
    expect(identity).toBe(await loadIdentity(evolu));
    expect(identity.mnemonic.split(" ")).toHaveLength(24);
    expect(identity.keys.nostr.npub).toMatch(/^npub1/u);
    expect(identity.keys.bip39Seed).toHaveLength(64);
  });

  it("normalises a typed phrase and rejects an invalid one", async () => {
    const { mnemonic } = await loadIdentity(createTestEvolu());
    expect(
      parseMnemonic(`  ${mnemonic.toUpperCase().replaceAll(" ", "\n ")} `),
    ).toBe(mnemonic);
    expect(parseMnemonic(mnemonic.replace(/\w+$/u, "zoo"))).toBeNull();
  });
});

describe("shop", () => {
  it("stores the account as an IBAN and its normalised display form", async () => {
    const evolu = createTestEvolu();
    const account = parseCzechAccount(" 19-2000145399 / 0800 ");
    if (Either.isLeft(account)) throw account.left;
    await saveShop(evolu, { name: " Kavárna ", account: account.right });
    const [shop] = await evolu.loadQuery(
      evolu.createQuery((db) =>
        db.selectFrom("shop").selectAll().where("id", "=", shopId),
      ),
    );
    expect(shop).toMatchObject({
      name: "Kavárna",
      iban: "CZ6508000000192000145399",
      accountDisplay: "19-2000145399/0800",
    });
  });
});

describe("payments", () => {
  it("creates pending bank payments with a variable symbol, newest first", async () => {
    const evolu = createTestEvolu();
    const first = await createPayment(evolu, 12_550, 1_000);
    const second = await createPayment(evolu, 100, 2_000);
    const payments = await loadPayments(evolu);
    expect(payments.map((payment) => payment.id)).toEqual([second, first]);
    expect(payments[1]).toMatchObject({
      amountCzk: 12_550,
      method: "bank",
      status: "pending",
      createdAtMs: 1_000,
      updatedAtMs: 1_000,
      paidAtMs: null,
      createdBy: device,
    });
    expect(payments[1]?.vs).toMatch(/^[1-9]\d{9}$/u);
    expect(payments[0]?.vs).not.toBe(payments[1]?.vs);
  });

  it("marks a payment paid once and never cancels a paid one", async () => {
    const evolu = createTestEvolu();
    await createPayment(evolu, 500, 1_000);
    const [pending] = await loadPayments(evolu);
    if (!pending) throw new Error("no payment");
    await changePaymentStatus(evolu, pending, "paid", 5_000);
    const [paid] = await loadPayments(evolu);
    expect(paid).toMatchObject({
      status: "paid",
      paidAtMs: 5_000,
      updatedAtMs: 5_000,
    });
    if (!paid) throw new Error("no payment");
    await changePaymentStatus(evolu, paid, "cancelled", 6_000);
    expect((await loadPayments(evolu))[0]).toMatchObject({
      status: "paid",
      updatedAtMs: 5_000,
    });
  });

  it("cancels a pending payment without a paid time", async () => {
    const evolu = createTestEvolu();
    await createPayment(evolu, 500, 1_000);
    const [pending] = await loadPayments(evolu);
    if (!pending) throw new Error("no payment");
    await changePaymentStatus(evolu, pending, "cancelled", 2_000);
    expect((await loadPayments(evolu))[0]).toMatchObject({
      status: "cancelled",
      paidAtMs: null,
    });
  });
});

describe("settings", () => {
  it("keeps one row per key", async () => {
    const evolu = createTestEvolu();
    await saveSetting(evolu, "language", "en");
    await saveSetting(evolu, "language", "cs");
    await saveSetting(evolu, "theme", "dark");
    const rows = await evolu.loadQuery(
      evolu.createQuery((db) =>
        db
          .selectFrom("setting")
          .select(["key", "value"])
          .where("isDeleted", "is not", sqliteTrue)
          .orderBy("key"),
      ),
    );
    expect(rows).toEqual([
      { key: "language", value: "cs" },
      { key: "theme", value: "dark" },
    ]);
  });
});
