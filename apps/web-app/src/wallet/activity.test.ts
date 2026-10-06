import { CzkAmount, Sats } from "@platitprosim/core";
import { describe, expect, it } from "vitest";
import type { Payment, Receipt, Withdrawal } from "../storage";
import {
  EmployeeId,
  PaymentRowId,
  ReceiptId,
  receiptIdFor,
  WithdrawalId,
} from "../storage/schema";
import { balanceChange, parseSats, walletActivity } from "./activity";

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
  cashuReceiveId: null,
  employeeId: null,
  lockedToken: null,
  forwardOperationId: null,
  forwardedAtMs: null,
  reportedAtMs: null,
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

const receipt = (id: string, overrides: Partial<Receipt>): Receipt => ({
  id: ReceiptId.orThrow(id.padEnd(22, "A")),
  kind: "cashu",
  sats: 99,
  receivedAtMs: 1_000,
  paymentId: null,
  employeeId: null,
  ...overrides,
});

describe("walletActivity", () => {
  it("lists what reached and left the wallet, newest first", () => {
    const cashu = payment("Cashu", { method: "cashu", paidAtMs: 1_000 });
    const items = walletActivity(
      [
        payment("Paid", { paidAtMs: 3_000 }),
        payment("Bank", { method: "bank", paidAtMs: 4_000 }),
        payment("Pending", { status: "pending", paidAtMs: null }),
        payment("Employee", {
          employeeId: EmployeeId.orThrow("Employee".padEnd(22, "A")),
          paidAtMs: 5_000,
        }),
        cashu,
      ],
      [
        receipt("Paid", { paymentId: cashu.id, receivedAtMs: 1_000 }),
        receipt("Stray", { sats: 30, receivedAtMs: 6_000 }),
      ],
      [withdrawal("Out", { createdAtMs: 2_000, feeSats: 2, status: "done" })],
    );
    expect(
      items.map((item) => [item.kind, item.atMs, item.sats, item.feeSats]),
    ).toEqual([
      ["receipt", 6_000, 30, 0],
      ["lightning", 3_000, 100, 0],
      ["withdrawal", 2_000, 42, 2],
      ["receipt", 1_000, 99, 1],
    ]);
  });

  it("adds up to the balance the movements left", () => {
    const items = walletActivity(
      [payment("Paid", { sats: Sats.make(500) })],
      [receipt("Forward", { kind: "forward", sats: 249 })],
      [
        withdrawal("Linky", { amountSats: 100, feeSats: 1, status: "pending" }),
        withdrawal("Ln", {
          kind: "lightning",
          amountSats: 533,
          feeSats: 2,
          status: "done",
        }),
        withdrawal("Failed", { amountSats: 50, status: "failed" }),
      ],
    );
    expect(items.reduce((sum, item) => sum + balanceChange(item), 0)).toBe(
      500 + 249 - 101 - 535,
    );
  });

  it("lists a second payment of a paid payment as paid again, and counts it", () => {
    const paid = payment("Twice", {
      method: "cashu",
      cashuReceiveId: "receive-1",
    });
    const items = walletActivity(
      [paid],
      [
        {
          ...receipt("", { paymentId: paid.id }),
          id: receiptIdFor("receive-1"),
        },
        receipt("Late", { kind: "lightning", sats: 100, paymentId: paid.id }),
      ],
      [],
    );
    expect(
      items.map((item) => item.kind === "receipt" && item.paidAgain),
    ).toEqual([false, true]);
    expect(items.reduce((sum, item) => sum + balanceChange(item), 0)).toBe(199);
  });

  it("keeps only the newest items", () => {
    const payments = [1, 2, 3].map((n) =>
      payment(`P${n}`, { paidAtMs: n * 1_000 }),
    );
    expect(
      walletActivity(payments, [], [], 2).map((item) => item.atMs),
    ).toEqual([3_000, 2_000]);
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
