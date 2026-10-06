/**
 * Runs the owner's wallet against the local dev mint (`bun run dev:services`)
 * and checks that the activity adds up to the balance. Skipped when that
 * mint does not answer.
 */
import {
  Amount,
  Bolt11Invoice,
  Melt,
  MeltDraft,
  MintUrl,
  parseP2pkPubkey,
  Send,
  SendDraft,
  Topup,
  TopupDraft,
} from "@linky-fit/linkshu";
import {
  AppMessageReceived,
  CashuTokenText,
  ChatMessageReceived,
  ClientId,
  EnqueueReceipt,
  OutboxJobId,
  OutboxRef,
  RumorId,
  TokenBody,
  UnixSeconds,
} from "@linky-fit/linkstr";
import { makeIdentity } from "@linky-fit/linkstr/testing";
import { appMessages, CzkAmount, PaymentId } from "@platitprosim/core";
import type { AppMessage } from "@platitprosim/core";
import { Effect, Either } from "effect";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createBitcoinPayments } from "../services/bitcoinPayments";
import { createSweep } from "../services/employeeSync";
import { receiveLockedTokens } from "../services/lockedTokens";
import { makeLinkshuRuntime } from "../services/runtimes";
import { fakeNostr, memoryWalletStores } from "../services/testing/fakes";
import { createWallet } from "../services/wallet";
import type { Wallet } from "../services/wallet";
import { createWithdrawals } from "../services/withdrawals";
import {
  cancelPayment,
  createPayment,
  loadIdentity,
  loadPayment,
  loadPayments,
  loadReceipts,
  loadWalletBalance,
  loadWithdrawals,
} from "../storage";
import type { AppEvolu } from "../storage";
import { createTestEvolu } from "../storage/testing/testEvolu";
import { balanceChange, walletActivity } from "./activity";

// Before cashu-ts loads: jsdom's events break undici's WebSocket, so quote updates are polled instead.
vi.hoisted(() => {
  const states = { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 };
  vi.stubGlobal(
    "WebSocket",
    Object.assign(() => {
      throw new Error("no WebSocket in this test");
    }, states),
  );
});

const mint = MintUrl.make("http://localhost:3348");
const czkPerBtc = 2_500_000;

const mintAnswers = await fetch(`${mint}/v1/info`, {
  signal: AbortSignal.timeout(1_000),
}).then(
  (response) => response.ok,
  () => false,
);

/** Marks an invoice of the local FakeWallet mint paid, as `bun run mint:pay` does. */
const markPaid = (invoice: string) => {
  const result = spawnSync("docker", [
    "compose",
    "-f",
    // Tests run from apps/web-app.
    resolve(process.cwd(), "../../docker-compose.dev.yml"),
    "exec",
    "-T",
    "cashu-mint",
    "python3",
    "-c",
    `import sqlite3, sys, time
db = sqlite3.connect("/app/data/mint/mint.sqlite3")
now = int(time.time())
db.execute("update mint_quotes set state = 'PAID', paid_time = ?, updated_at = ? where lower(request) = lower(?) and state = 'UNPAID'", (now, now, sys.argv[1]))
db.commit()`,
    invoice,
  ]);
  if (result.status !== 0) throw new Error(String(result.stderr));
};

const deviceWallet = async (
  evolu: AppEvolu,
  inMemory: boolean,
): Promise<Wallet> => {
  const { keys } = await loadIdentity(evolu);
  return createWallet(
    makeLinkshuRuntime(evolu, keys, {
      relays: [],
      allowInsecureLocalhostRelays: false,
      walletStores: inMemory ? memoryWalletStores() : undefined,
    }),
    keys,
  );
};

const succeed = <A, E>(outcome: Either.Either<A, E>): A => {
  if (Either.isLeft(outcome)) throw new Error(JSON.stringify(outcome.left));
  return outcome.right;
};

/** A customer's wallet at the local mint, funded by Lightning. */
const customerWallet = async (sats: number) => {
  const wallet = await deviceWallet(createTestEvolu(), true);
  succeed(
    await wallet.run(
      Effect.scoped(
        Effect.gen(function* () {
          const handle = yield* (yield* Topup).start(
            new TopupDraft({ mint, amount: Amount.make(sats) }),
          );
          markPaid(handle.quote.invoice);
          yield* handle.result;
        }),
      ),
    ),
  );
  const token = async (amount: number) =>
    succeed(
      await wallet.run(
        Effect.flatMap(Send, (send) =>
          send.send(
            new SendDraft({
              mint,
              amount: Amount.make(amount),
              produceAs: "issued",
            }),
          ),
        ),
      ),
    ).tokenText;
  const pay = async (bolt11: string) =>
    succeed(
      await wallet.run(
        Effect.flatMap(Melt, (melt) =>
          melt.melt(
            new MeltDraft({ mint, invoice: Bolt11Invoice.make(bolt11) }),
          ),
        ),
      ),
    );
  const invoiceFor = async (amount: number) =>
    succeed(
      await wallet.run(
        Effect.scoped(
          Effect.map(
            Effect.flatMap(Topup, (topup) =>
              topup.start(
                new TopupDraft({ mint, amount: Amount.make(amount) }),
              ),
            ),
            (handle) => handle.quote.invoice,
          ),
        ),
      ),
    );
  return { token, pay, invoiceFor };
};

const tokenMessage = (token: string) =>
  new ChatMessageReceived({
    messageId: RumorId.make("ab".repeat(32)),
    from: makeIdentity().pubkey,
    body: new TokenBody({ token: CashuTokenText.make(token) }),
    replyTo: null,
    root: null,
    editOf: null,
    clientId: null,
    sentAt: UnixSeconds.make(1_700_000_000),
  });

const enqueued = (ref: string) =>
  new EnqueueReceipt({
    jobId: OutboxJobId.make(ref),
    ref: OutboxRef.make(ref),
    rumorId: RumorId.make("ef".repeat(32)),
    clientId: ClientId.make(ref),
    sentAt: UnixSeconds.make(1_700_000_000),
  });

describe.runIf(mintAnswers)("the owner's wallet at the local mint", () => {
  it(
    "lists activity that adds up to the balance",
    { timeout: 120_000 },
    async () => {
      const evolu = createTestEvolu();
      const wallet = await deviceWallet(evolu, false);
      const fake = fakeNostr({
        sendToken: async (_to, _token, ref) => enqueued(ref),
      });
      const payments = createBitcoinPayments({
        evolu,
        nostr: fake.nostr,
        wallet,
        czkPerBtc: async () => czkPerBtc,
      });
      receiveLockedTokens(evolu, fake.nostr, wallet);
      const withdrawals = createWithdrawals({
        evolu,
        nostr: fake.nostr,
        wallet,
      });
      const customer = await customerWallet(4_000);
      const [deliverChat] = fake.inbox;
      const [deliverAppMessage] = fake.appMessages;
      if (!deliverChat || !deliverAppMessage) throw new Error("no handlers");
      const shop = { mintUrl: mint, name: "Kavárna" };

      const bitcoinPayment = async (amountCzk: number) => {
        const id = await createPayment(evolu, {
          amountCzk: CzkAmount.make(amountCzk),
          createdBy: fake.nostr.pubkey,
        });
        const payment = await loadPayment(evolu, id);
        if (!payment) throw new Error("no payment");
        expect(await payments.request(payment, shop)).toBeNull();
        const requested = await loadPayment(evolu, id);
        if (!requested?.sats || !requested.invoice) throw new Error("no leg");
        return { id, sats: requested.sats, invoice: requested.invoice };
      };
      const statusOf = async (id: string) =>
        (await loadPayment(evolu, id))?.status;

      // Lightning: the customer's wallet pays the invoice.
      const lightning = await bitcoinPayment(2_500);
      await customer.pay(lightning.invoice);
      await expect
        .poll(() => statusOf(lightning.id), { timeout: 30_000 })
        .toBe("paid");

      // Two requests for the same CZK ask different sats; paid out of order, each settles its own.
      const older = await bitcoinPayment(500);
      const newer = await bitcoinPayment(500);
      expect(newer.sats).toBe(older.sats + 1);
      await deliverChat(tokenMessage(await customer.token(older.sats)), "live");
      expect(await statusOf(older.id)).toBe("paid");
      expect(await statusOf(newer.id)).toBe("pending");
      await deliverChat(tokenMessage(await customer.token(newer.sats)), "live");
      expect(await statusOf(newer.id)).toBe("paid");

      // A token for a cancelled request still pays it.
      const cancelled = await bitcoinPayment(400);
      const row = await loadPayment(evolu, cancelled.id);
      if (!row) throw new Error("no payment");
      await cancelPayment(evolu, row);
      await deliverChat(
        tokenMessage(await customer.token(cancelled.sats)),
        "live",
      );
      expect(await statusOf(cancelled.id)).toBe("paid");

      // A token that pays no request is kept as an unassigned receipt.
      await deliverChat(tokenMessage(await customer.token(77)), "live");

      // An employee device forwards what it took, locked to the owner.
      const employee = createTestEvolu();
      const employeeWallet = await deviceWallet(employee, false);
      succeed(await employeeWallet.receive(await customer.token(300)));
      const owner = parseP2pkPubkey(fake.nostr.pubkey);
      if (!owner) throw new Error("no owner key");
      const swept = await createSweep(employee, employeeWallet)(mint, owner);
      if (swept === null || swept === "retry") throw new Error("nothing swept");
      const forward: AppMessage = {
        v: 1,
        type: "LockedToken",
        paymentIds: [PaymentId.make("p1")],
        token: swept.tokenText,
      };
      await deliverAppMessage(
        forward,
        new AppMessageReceived({
          messageId: RumorId.make("cd".repeat(32)),
          from: makeIdentity().pubkey,
          app: appMessages.app,
          content: JSON.stringify(forward),
          clientId: null,
          sentAt: UnixSeconds.make(1_700_000_000),
        }),
      );

      // Out over Lightning, never above the confirmed maximum, and to Linky.
      const before = await loadWalletBalance(evolu);
      const invoice = await customer.invoiceFor(333);
      const payout = succeed(
        await withdrawals.quoteLightning(
          {
            kind: "invoice",
            invoice: Bolt11Invoice.make(invoice),
            amountSats: 333,
          },
          333,
        ),
      );
      expect(succeed(await withdrawals.payLightning(payout))).toBe("paid");
      const debit = before - (await loadWalletBalance(evolu));
      expect(debit).toBeLessThanOrEqual(payout.cost.maxTotal);
      const [paidOut] = await loadWithdrawals(evolu);
      expect((paidOut?.amountSats ?? 0) + (paidOut?.feeSats ?? 0)).toBe(debit);
      expect(
        await withdrawals.sendToLinky(makeIdentity().pubkey, 100),
      ).toBeNull();

      const activity = walletActivity(
        await loadPayments(evolu),
        await loadReceipts(evolu),
        await loadWithdrawals(evolu),
        Infinity,
      );
      expect(activity.some((item) => item.feeSats > 0)).toBe(true);
      expect(
        activity.some(
          (item) => item.kind === "receipt" && item.receipt.paymentId === null,
        ),
      ).toBe(true);
      expect(activity.reduce((sum, item) => sum + balanceChange(item), 0)).toBe(
        await loadWalletBalance(evolu),
      );
    },
  );
});
