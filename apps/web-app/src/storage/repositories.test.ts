import { sqliteTrue } from "@evolu/common";
import { parsePubkey } from "@linky-fit/linkstr";
import {
  buildCashuRequest,
  CzkAmount,
  parseCzechAccount,
  Sats,
} from "@platitprosim/core";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { loadIdentity, parseMnemonic } from "./identity";
import {
  attachBitcoinRequest,
  bitcoinRequestOf,
  cancelPayment,
  clearBitcoinRequest,
  completePayment,
  createPayment,
  loadPayments,
  openBitcoinPayments,
} from "./payments";
import {
  createWithdrawal,
  finishWithdrawal,
  loadWithdrawals,
} from "./withdrawals";
import { shopId } from "./schema";
import { saveSetting } from "./settings";
import { saveShop } from "./shop";
import { createTestEvolu } from "./testing/testEvolu";

const device = parsePubkey("a".repeat(64));
if (device === null) throw new Error("bad test pubkey");

const newPayment = (
  evolu: ReturnType<typeof createTestEvolu>,
  amount: number,
  now: number,
) =>
  createPayment(
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
    const first = await newPayment(evolu, 12_550, 1_000);
    const second = await newPayment(evolu, 100, 2_000);
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
    await newPayment(evolu, 500, 1_000);
    const [pending] = await loadPayments(evolu);
    if (!pending) throw new Error("no payment");
    await completePayment(evolu, pending, "bank", 5_000);
    const [paid] = await loadPayments(evolu);
    expect(paid).toMatchObject({
      status: "paid",
      paidAtMs: 5_000,
      updatedAtMs: 5_000,
    });
    if (!paid) throw new Error("no payment");
    await cancelPayment(evolu, paid, 6_000);
    expect((await loadPayments(evolu))[0]).toMatchObject({
      status: "paid",
      updatedAtMs: 5_000,
    });
  });

  it("cancels a pending payment without a paid time", async () => {
    const evolu = createTestEvolu();
    await newPayment(evolu, 500, 1_000);
    const [pending] = await loadPayments(evolu);
    if (!pending) throw new Error("no payment");
    await cancelPayment(evolu, pending, 2_000);
    expect((await loadPayments(evolu))[0]).toMatchObject({
      status: "cancelled",
      paidAtMs: null,
    });
  });
});

describe("bitcoin payments", () => {
  const request = (paymentId: string) => ({
    sats: Sats.make(1_336),
    czkPerBtc: 1_871_628.5,
    quoteId: "quote-1",
    invoice: "lnbc13360n1fake",
    paymentRequest: buildCashuRequest({
      sats: Sats.make(1_336),
      mintUrl: "http://localhost:3348",
      deviceNprofile: "nprofile1test",
      paymentId,
    }),
  });

  it("stores the Bitcoin leg on the payment row and opens it for matching", async () => {
    const evolu = createTestEvolu();
    const id = await newPayment(evolu, 2_500, 1_000);
    await attachBitcoinRequest(evolu, id, request(id), 2_000);
    const [payment] = await loadPayments(evolu);
    if (!payment) throw new Error("no payment");
    expect(bitcoinRequestOf(payment)).toEqual(request(id));
    expect(payment.updatedAtMs).toBe(2_000);
    expect(
      openBitcoinPayments([payment]).map(({ id, sats, mintUrl }) => ({
        id,
        sats,
        mintUrl,
      })),
    ).toEqual([{ id, sats: 1_336, mintUrl: "http://localhost:3348" }]);
  });

  it("settles the method when the payment completes and closes it for matching", async () => {
    const evolu = createTestEvolu();
    const id = await newPayment(evolu, 2_500, 1_000);
    await attachBitcoinRequest(evolu, id, request(id));
    const [pending] = await loadPayments(evolu);
    if (!pending) throw new Error("no payment");
    expect(await completePayment(evolu, pending, "lightning", 3_000)).toBe(
      true,
    );
    const [paid] = await loadPayments(evolu);
    if (!paid) throw new Error("no payment");
    expect(paid).toMatchObject({
      status: "paid",
      method: "lightning",
      paidAtMs: 3_000,
    });
    expect(openBitcoinPayments([paid])).toEqual([]);
    expect(await completePayment(evolu, paid, "cashu")).toBe(false);
    expect((await loadPayments(evolu))[0]?.method).toBe("lightning");
  });

  it("lets a cancelled payment still be paid, and drops an expired leg", async () => {
    const evolu = createTestEvolu();
    const id = await newPayment(evolu, 2_500, 1_000);
    await attachBitcoinRequest(evolu, id, request(id));
    const [pending] = await loadPayments(evolu);
    if (!pending) throw new Error("no payment");
    await cancelPayment(evolu, pending);
    const [cancelled] = await loadPayments(evolu);
    if (!cancelled) throw new Error("no payment");
    expect(openBitcoinPayments([cancelled])).toHaveLength(1);
    await clearBitcoinRequest(evolu, id);
    const [cleared] = await loadPayments(evolu);
    if (!cleared) throw new Error("no payment");
    expect(bitcoinRequestOf(cleared)).toBeNull();
    expect(openBitcoinPayments([cleared])).toEqual([]);
  });
});

describe("withdrawals", () => {
  it("records a pending withdrawal and closes it once", async () => {
    const evolu = createTestEvolu();
    const id = await createWithdrawal(
      evolu,
      {
        kind: "lightning",
        target: "alice@example.com",
        amountSats: 500,
        quoteId: "q1",
      },
      1_000,
    );
    await finishWithdrawal(evolu, id, { status: "done", feeSats: 2 }, 2_000);
    await finishWithdrawal(
      evolu,
      id,
      { status: "failed", error: "late" },
      3_000,
    );
    expect(await loadWithdrawals(evolu)).toEqual([
      {
        id,
        kind: "lightning",
        target: "alice@example.com",
        amountSats: 500,
        feeSats: 2,
        status: "done",
        createdAtMs: 1_000,
        completedAtMs: 2_000,
        quoteId: "q1",
        operationId: null,
        error: null,
      },
    ]);
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
