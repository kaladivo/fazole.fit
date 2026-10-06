import { CzkAmount, Sats } from "@platitprosim/core";
import { describe, expect, it } from "vitest";
import type { Payment, Withdrawal } from "../storage";
import { PaymentRowId, WithdrawalId } from "../storage/schema";
import { parseSats, walletActivity } from "./activity";

const payment = (id: string, overrides: Partial<Payment>): Payment => ({
  id: PaymentRowId.orThrow(id.padEnd(22, "A")),
  amountCzk: CzkAmount.make(2_500),
  sats: Sats.make(100),
  method: "lightning",
  status: "paid",
  vs: null,
  createdAtMs: 1_000,
  updatedAtMs: 1_000,
  paidAtMs: 1_000,
  createdBy: "a".repeat(64),
  quoteId: null,
  invoice: null,
  paymentRequest: null,
  czkPerBtc: null,
  ...overrides,
});

const withdrawal = (
  id: string,
  overrides: Partial<Withdrawal>,
): Withdrawal => ({
  id: WithdrawalId.orThrow(id.padEnd(22, "A")),
  kind: "linky",
  target: "npub1test",
  amountSats: 40,
  feeSats: null,
  status: "pending",
  createdAtMs: 1_000,
  completedAtMs: null,
  quoteId: null,
  operationId: null,
  error: null,
  ...overrides,
});

describe("walletActivity", () => {
  it("lists paid Bitcoin payments and withdrawals, newest first", () => {
    const items = walletActivity(
      [
        payment("Paid", { paidAtMs: 3_000 }),
        payment("Bank", { method: "bank", paidAtMs: 4_000 }),
        payment("Pending", { status: "pending", paidAtMs: null }),
        payment("Cashu", { method: "cashu", paidAtMs: 1_000 }),
      ],
      [withdrawal("Out", { createdAtMs: 2_000, feeSats: 2, status: "done" })],
    );
    expect(items.map((item) => [item.kind, item.atMs, item.sats])).toEqual([
      ["payment", 3_000, 100],
      ["withdrawal", 2_000, 42],
      ["payment", 1_000, 100],
    ]);
  });

  it("keeps only the newest items", () => {
    const payments = [1, 2, 3].map((n) =>
      payment(`P${n}`, { paidAtMs: n * 1_000 }),
    );
    expect(walletActivity(payments, [], 2).map((item) => item.atMs)).toEqual([
      3_000, 2_000,
    ]);
  });
});

describe("parseSats", () => {
  it.each([
    ["1000", 1_000],
    [" 1 000 ", 1_000],
    ["0", null],
    ["12.5", null],
    ["-5", null],
    ["", null],
    ["abc", null],
  ])("%j is %j", (text, sats) => {
    expect(parseSats(text)).toBe(sats);
  });
});
