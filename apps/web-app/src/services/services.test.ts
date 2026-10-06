import {
  DecodedToken,
  encodeToken,
  MintUnreachable,
  MintUrl,
  OperationId,
  ReceiveReceipt,
  TokenAlreadyKnown,
  TokenTransfer,
} from "@linky-fit/linkshu";
import {
  AppMessageReceived,
  AppMessages,
  ChatMessageReceived,
  ClientId,
  encodeNpub,
  EnqueueReceipt,
  LinkstrIdentity,
  makeRelayPoolTransport,
  NostrTransport,
  OutboxJobId,
  OutboxRef,
  RelayPolicy,
  RelayUrl,
  RumorId,
  TextBody,
  TokenBody,
  CashuTokenText,
  UnixSeconds,
} from "@linky-fit/linkstr";
import type { Pubkey } from "@linky-fit/linkstr";
import {
  eventually,
  FakeRelay,
  makeIdentity,
  poolFor,
  recipientOf,
  stubWrapTransport,
} from "@linky-fit/linkstr/testing";
import type { SignedWrapEvent } from "@linky-fit/linkstr/testing";
import {
  appMessages,
  buildCashuRequest,
  CzkAmount,
  parseCzechAccount,
  PaymentId,
  Sats,
} from "@platitprosim/core";
import type { AppMessage, DeviceKeys } from "@platitprosim/core";
import { Effect, Either, Layer, Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addEmployee,
  attachBitcoinRequest,
  cancelPayment,
  clearBitcoinRequest,
  completePayment,
  createPayment,
  createWithdrawal,
  linkEmployeeDevice,
  loadEmployees,
  loadIdentity,
  loadPayments,
  loadReceipts,
  loadWithdrawals,
  saveShop,
  upsertReportedPayment,
} from "../storage";
import type { AppEvolu } from "../storage";
import { makeEvoluOutboxStore } from "../storage/linkstr";
import { createTestEvolu } from "../storage/testing/testEvolu";
import { createBitcoinPayments } from "./bitcoinPayments";
import { receiveLockedTokens } from "./lockedTokens";
import { createNostr } from "./nostr";
import type { Nostr } from "./nostr";
import { makeLinkshuRuntime, makeLinkstrRuntime } from "./runtimes";
import type { LinkstrRuntime } from "./runtimes";
import {
  fakeNostr,
  memoryWalletStores,
  scriptedReceive,
} from "./testing/fakes";
import { walletActivity } from "../wallet/activity";
import { createWallet } from "./wallet";
import type { Wallet } from "./wallet";
import { createWithdrawals, parseLightningTarget } from "./withdrawals";

const mint = "http://localhost:3348";
const relay = RelayUrl.make("wss://relay.test");
// A FakeWallet invoice of the local dev mint for 2 084 sat.
const invoice =
  "lnbc20840n1p4vf3079qypqqqdq6fdshdsapwfhxzgz4ypxv8tts0yxqrrsssp5p9n75rrkt7v9slzhqwmewr5pqjktywd064ge2wpn4jqwm3rr6tzspp5res2cd0mu7y3cg24dmrj90u28mxzll0vexp38elkdvggd53ulrusuhnauhksa5w3rz8ng9p37wr7x8z9v44v2rquk86z48qxuutzfljr3gzx8uxqka2sc2fyymm7jmeu7gent8yadv0nvqmzcmk0phurxtqpwmex3a";

const tokenOf = (amount: number) =>
  encodeToken(
    Schema.decodeUnknownSync(DecodedToken)({
      mint,
      unit: "sat",
      memo: null,
      proofs: [
        {
          id: "00ad268c4d1f5826",
          amount,
          secret: `secret-${amount}`,
          C: "02".padEnd(66, "a"),
        },
      ],
    }),
  );

const receipt = (amount: number, operationId = "receive-1") =>
  Schema.decodeUnknownSync(ReceiveReceipt)({
    operationId,
    tokenText: tokenOf(amount),
    mint,
    unit: "sat",
    amount,
  });

const chatMessage = (body: ChatMessageReceived["body"]) =>
  new ChatMessageReceived({
    messageId: RumorId.make("ab".repeat(32)),
    from: makeIdentity().pubkey,
    body,
    replyTo: null,
    root: null,
    editOf: null,
    clientId: null,
    sentAt: UnixSeconds.make(1_700_000_000),
  });

const setup = async () => {
  const evolu = createTestEvolu();
  const { keys } = await loadIdentity(evolu);
  const wallet = createWallet(
    makeLinkshuRuntime(evolu, keys, {
      relays: [],
      allowInsecureLocalhostRelays: false,
      walletStores: memoryWalletStores(),
    }),
    keys,
  );
  return { evolu, keys, wallet };
};

/** A pending 25 Kč payment whose Bitcoin leg asks 100 sat at the local mint. */
const pendingBitcoinPayment = async (evolu: AppEvolu) => {
  const id = await createPayment(evolu, {
    amountCzk: CzkAmount.make(2_500),
    createdBy: makeIdentity().pubkey,
  });
  await attachBitcoinRequest(evolu, id, {
    sats: Sats.make(100),
    czkPerBtc: 2_500_000,
    quoteId: "quote-1",
    invoice,
    paymentRequest: buildCashuRequest({
      sats: Sats.make(100),
      mintUrl: mint,
      deviceNprofile: "nprofile1test",
      paymentId: id,
    }),
  });
  return id;
};

const paymentById = async (evolu: AppEvolu, id: string) =>
  (await loadPayments(evolu)).find((payment) => payment.id === id);

/** The NUT-18 payload a non-Linky wallet sends for the request `id`. */
const nut18Payload = (id: string) =>
  JSON.stringify({
    id,
    mint,
    unit: "sat",
    proofs: [{ id: "00ad268c4d1f5826", amount: 100, secret: "s", C: "02" }],
  });

const receiveId = OperationId.make("receive-1");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseLightningTarget", () => {
  it("reads an invoice with its amount, also behind a scheme or in a BIP-321 URI", () => {
    for (const text of [
      invoice,
      ` lightning:${invoice.toUpperCase()} `,
      `bitcoin:?lightning=${invoice}&creq=creqAxyz`,
    ]) {
      expect(parseLightningTarget(text)).toEqual({
        kind: "invoice",
        invoice,
        amountSats: 2_084,
      });
    }
  });

  it("reads a Lightning address and rejects other text", () => {
    expect(parseLightningTarget("alice@example.com")).toEqual({
      kind: "address",
      target: "alice@example.com",
    });
    expect(parseLightningTarget("")).toBeNull();
    expect(parseLightningTarget("lnbc1broken")).toBeNull();
    expect(parseLightningTarget("hello")).toBeNull();
  });
});

describe("BitcoinPayments.request", () => {
  it("reports a missing rate and leaves the payment without a Bitcoin leg", async () => {
    const { evolu, wallet } = await setup();
    const id = await createPayment(evolu, {
      amountCzk: CzkAmount.make(2_500),
      createdBy: makeIdentity().pubkey,
    });
    const payments = createBitcoinPayments({
      evolu,
      nostr: fakeNostr().nostr,
      wallet,
      czkPerBtc: async () => null,
    });
    const payment = await paymentById(evolu, id);
    if (!payment) throw new Error("no payment");
    expect(
      await payments.request(payment, { mintUrl: mint, name: "Kavárna" }),
    ).toEqual({ reason: "rate-unavailable" });
    expect((await paymentById(evolu, id))?.quoteId).toBeNull();
  });

  it("reports a mint it cannot reach", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { evolu, wallet } = await setup();
    const id = await createPayment(evolu, {
      amountCzk: CzkAmount.make(2_500),
      createdBy: makeIdentity().pubkey,
    });
    const payments = createBitcoinPayments({
      evolu,
      nostr: fakeNostr().nostr,
      wallet,
      czkPerBtc: async () => 2_500_000,
    });
    const payment = await paymentById(evolu, id);
    if (!payment) throw new Error("no payment");
    expect(
      await payments.request(payment, {
        mintUrl: "http://127.0.0.1:9",
        name: "Kavárna",
      }),
    ).toEqual({ reason: "mint-unreachable" });
  });

  it("offers no Bitcoin below the amount the mint's fees allow", async () => {
    const { evolu, wallet } = await setup();
    const id = await createPayment(evolu, {
      amountCzk: CzkAmount.make(1),
      createdBy: makeIdentity().pubkey,
    });
    const payments = createBitcoinPayments({
      evolu,
      nostr: fakeNostr().nostr,
      wallet,
      czkPerBtc: async () => 2_500_000,
    });
    const payment = await paymentById(evolu, id);
    if (!payment) throw new Error("no payment");
    expect(
      await payments.request(payment, {
        mintUrl: "http://127.0.0.1:9",
        name: "Kavárna",
      }),
    ).toEqual({ reason: "below-minimum", minimumCzk: 100 });
    expect((await paymentById(evolu, id))?.sats).toBeNull();
  });

  it("keeps the leg a payment already has, even when given a stale row", async () => {
    const { evolu, wallet } = await setup();
    const id = await createPayment(evolu, {
      amountCzk: CzkAmount.make(2_500),
      createdBy: makeIdentity().pubkey,
    });
    const stale = await paymentById(evolu, id);
    await attachBitcoinRequest(evolu, id, {
      sats: Sats.make(100),
      czkPerBtc: 2_500_000,
      quoteId: "existing",
      invoice,
      paymentRequest: "creqAexisting",
    });
    let rateAsked = false;
    const payments = createBitcoinPayments({
      evolu,
      nostr: fakeNostr().nostr,
      wallet,
      czkPerBtc: async () => {
        rateAsked = true;
        return 2_500_000;
      },
    });
    if (!stale) throw new Error("no payment");
    expect(
      await payments.request(stale, { mintUrl: mint, name: "Kavárna" }),
    ).toBeNull();
    expect(rateAsked).toBe(false);
    expect((await paymentById(evolu, id))?.quoteId).toBe("existing");
  });
});

describe("tokens sent to the device", () => {
  const withHandler = async (
    answer: Parameters<typeof scriptedReceive>[1],
    overrides: Partial<Wallet> = {},
  ) => {
    const { evolu, wallet } = await setup();
    const fake = fakeNostr();
    const scripted = scriptedReceive(wallet, answer, overrides);
    createBitcoinPayments({
      evolu,
      nostr: fake.nostr,
      wallet: scripted.wallet,
      czkPerBtc: async () => 2_500_000,
    });
    const [handler] = fake.inbox;
    if (!handler) throw new Error("no inbox handler");
    const id = await pendingBitcoinPayment(evolu);
    return { evolu, handler, calls: scripted.calls, id };
  };

  it("pays the matching payment with Cashu once the token is received", async () => {
    const { evolu, handler, calls, id } = await withHandler(() =>
      Either.right(receipt(100)),
    );
    const token = tokenOf(100);
    await handler(
      chatMessage(new TokenBody({ token: CashuTokenText.make(token) })),
      "live",
    );
    expect(calls).toEqual([{ text: token, unlock: false }]);
    expect(await paymentById(evolu, id)).toMatchObject({
      status: "paid",
      method: "cashu",
    });
  });

  it("records what reached the wallet, net of the mint's fee", async () => {
    const { evolu, handler, id } = await withHandler(() =>
      Either.right(receipt(99)),
    );
    await handler(
      chatMessage(new TokenBody({ token: CashuTokenText.make(tokenOf(100)) })),
      "live",
    );
    expect(await loadReceipts(evolu)).toMatchObject([
      { kind: "cashu", sats: 99, paymentId: id },
    ]);
  });

  it("pays a payment the merchant cancelled when its token arrives late", async () => {
    const { evolu, handler, id } = await withHandler(() =>
      Either.right(receipt(100)),
    );
    const cancelled = await paymentById(evolu, id);
    if (!cancelled) throw new Error("no payment");
    await cancelPayment(evolu, cancelled);
    await handler(
      chatMessage(new TokenBody({ token: CashuTokenText.make(tokenOf(100)) })),
      "live",
    );
    expect(await paymentById(evolu, id)).toMatchObject({
      status: "paid",
      method: "cashu",
      paidAtMs: expect.any(Number),
    });
  });

  it("keeps a token two requests could be paid by as an unassigned receipt", async () => {
    const { evolu, handler, id } = await withHandler(() =>
      Either.right(receipt(100)),
    );
    const twin = await pendingBitcoinPayment(evolu);
    await handler(
      chatMessage(new TokenBody({ token: CashuTokenText.make(tokenOf(100)) })),
      "live",
    );
    expect((await paymentById(evolu, id))?.status).toBe("pending");
    expect((await paymentById(evolu, twin))?.status).toBe("pending");
    expect(await loadReceipts(evolu)).toMatchObject([
      { kind: "cashu", sats: 100, paymentId: null },
    ]);
  });

  it("never pays a payment created after its token arrived, when the token replays", async () => {
    const { evolu, handler } = await withHandler(() =>
      Either.right(receipt(150)),
    );
    const token = chatMessage(
      new TokenBody({ token: CashuTokenText.make(tokenOf(150)) }),
    );
    await handler(token, "live");
    const later = await createPayment(evolu, {
      amountCzk: CzkAmount.make(3_750),
      createdBy: makeIdentity().pubkey,
    });
    await attachBitcoinRequest(evolu, later, {
      sats: Sats.make(150),
      czkPerBtc: 2_500_000,
      quoteId: "quote-2",
      invoice,
      paymentRequest: buildCashuRequest({
        sats: Sats.make(150),
        mintUrl: mint,
        deviceNprofile: "nprofile1test",
        paymentId: later,
      }),
    });
    const replay = scriptedReceive(
      (await setup()).wallet,
      () => Either.left(new TokenAlreadyKnown({ operationId: receiveId })),
      { isReceived: async () => true },
    );
    const fake = fakeNostr();
    createBitcoinPayments({
      evolu,
      nostr: fake.nostr,
      wallet: replay.wallet,
      czkPerBtc: async () => 2_500_000,
    });
    await fake.inbox[0]?.(token, "backfill");
    expect((await paymentById(evolu, later))?.status).toBe("pending");
  });

  it("matches a NUT-18 payload in a text message by its request id", async () => {
    const { evolu, handler, id } = await withHandler(() =>
      Either.right(receipt(100)),
    );
    await handler(
      chatMessage(new TextBody({ text: nut18Payload(id) })),
      "backfill",
    );
    expect((await paymentById(evolu, id))?.status).toBe("paid");
  });

  it("matches a NUT-18 payload naming a payment whose Lightning quote expired", async () => {
    const { evolu, handler, id } = await withHandler(() =>
      Either.right(receipt(100)),
    );
    await clearBitcoinRequest(evolu, id);
    await handler(
      chatMessage(new TextBody({ text: nut18Payload(id) })),
      "backfill",
    );
    expect(await paymentById(evolu, id)).toMatchObject({
      status: "paid",
      cashuReceiveId: "receive-1",
    });
  });

  it("pays the payment a replayed token was received for before a reload", async () => {
    const { evolu, handler, id } = await withHandler(
      () => Either.left(new TokenAlreadyKnown({ operationId: receiveId })),
      { isReceived: async (operationId) => operationId === "receive-1" },
    );
    await handler(
      chatMessage(new TokenBody({ token: CashuTokenText.make(tokenOf(100)) })),
      "backfill",
    );
    expect(await paymentById(evolu, id)).toMatchObject({
      status: "paid",
      method: "cashu",
      cashuReceiveId: "receive-1",
    });
  });

  it("never pays a second payment with a replayed token", async () => {
    const { evolu, handler, id } = await withHandler(
      () => Either.left(new TokenAlreadyKnown({ operationId: receiveId })),
      { isReceived: async () => true },
    );
    const earlier = await pendingBitcoinPayment(evolu);
    const paid = await paymentById(evolu, earlier);
    if (!paid) throw new Error("no payment");
    await completePayment(evolu, paid, { cashuReceiveId: "receive-1" });
    await handler(
      chatMessage(new TokenBody({ token: CashuTokenText.make(tokenOf(100)) })),
      "backfill",
    );
    await handler(
      chatMessage(new TextBody({ text: nut18Payload(id) })),
      "backfill",
    );
    expect((await paymentById(evolu, id))?.status).toBe("pending");
  });

  it("never pays a payment with a token the wallet did not receive", async () => {
    const { evolu, handler, id } = await withHandler(
      () => Either.left(new TokenAlreadyKnown({ operationId: receiveId })),
      { isReceived: async () => false },
    );
    await handler(
      chatMessage(new TextBody({ text: nut18Payload(id) })),
      "backfill",
    );
    expect((await paymentById(evolu, id))?.status).toBe("pending");
  });

  it("leaves a token for the next session while its mint is unreachable", async () => {
    const { evolu, handler, id } = await withHandler(() =>
      Either.left(
        new MintUnreachable({ mint: MintUrl.make(mint), detail: null }),
      ),
    );
    await expect(
      handler(
        chatMessage(
          new TokenBody({ token: CashuTokenText.make(tokenOf(100)) }),
        ),
        "live",
      ),
    ).rejects.toMatchObject({ _tag: "MintUnreachable" });
    expect((await paymentById(evolu, id))?.status).toBe("pending");
  });

  it("ignores chat text that carries no token", async () => {
    const { handler, calls } = await withHandler(() =>
      Either.right(receipt(100)),
    );
    await handler(chatMessage(new TextBody({ text: "thanks!" })), "live");
    expect(calls).toEqual([]);
  });
});

describe("LockedToken messages", () => {
  const lockedToken = (paymentIds: string[]): AppMessage => ({
    v: 1,
    type: "LockedToken",
    paymentIds: paymentIds.map((id) => PaymentId.make(id)),
    token: tokenOf(100),
  });

  const fromDevice = (from: Pubkey, message: AppMessage) =>
    new AppMessageReceived({
      messageId: RumorId.make("cd".repeat(32)),
      from,
      app: appMessages.app,
      content: JSON.stringify(message),
      clientId: null,
      sentAt: UnixSeconds.make(1_700_000_000),
    });

  /** An owner with one employee device that reported two paid Lightning payments. */
  const ownerWithReports = async () => {
    const { wallet } = await setup();
    const evolu = createTestEvolu();
    const device = makeIdentity().pubkey;
    await addEmployee(evolu, { pubkey: makeIdentity().pubkey, name: "Jana" });
    const [employee] = await loadEmployees(evolu);
    if (!employee) throw new Error("no employee");
    await linkEmployeeDevice(evolu, {
      employeeId: employee.id,
      pubkey: device,
    });
    for (const paymentId of ["p1", "p2"]) {
      await upsertReportedPayment(evolu, {
        device,
        employeeId: employee.id,
        record: {
          v: 1,
          type: "PaymentRecord",
          paymentId: PaymentId.make(paymentId),
          amountCzk: CzkAmount.make(2_500),
          sats: Sats.make(50),
          method: "lightning",
          status: "paid",
          createdAt: 1_000,
          updatedAt: 1_000,
          paidAt: 1_000,
        },
      });
    }
    const fake = fakeNostr();
    const scripted = scriptedReceive(wallet, () => Either.right(receipt(100)));
    receiveLockedTokens(evolu, fake.nostr, scripted.wallet);
    const [handler] = fake.appMessages;
    if (!handler) throw new Error("no app message handler");
    const deliver = (from: Pubkey, message: AppMessage) =>
      handler(message, fromDevice(from, message));
    return { evolu, device, deliver, calls: scripted.calls };
  };

  it("receives the token with the device key", async () => {
    const { deliver, calls } = await ownerWithReports();
    const message = lockedToken(["p1"]);
    await deliver(makeIdentity().pubkey, message);
    expect(calls).toEqual([{ text: tokenOf(100), unlock: true }]);
  });

  it("marks every payment one token carried, and lists the token once in the wallet", async () => {
    const { evolu, device, deliver } = await ownerWithReports();
    await deliver(device, lockedToken(["p1", "p2"]));
    const payments = await loadPayments(evolu);
    expect(payments.map(({ forwardedAtMs }) => forwardedAtMs)).toEqual([
      expect.any(Number),
      expect.any(Number),
    ]);
    const [employee] = await loadEmployees(evolu);
    expect(
      walletActivity(payments, await loadReceipts(evolu), []),
    ).toMatchObject([
      {
        kind: "receipt",
        sats: 100,
        receipt: { kind: "forward", employeeId: employee?.id },
      },
    ]);
  });

  it("creates no payment for an unknown id or sender, but still takes the funds", async () => {
    const { evolu, device, deliver, calls } = await ownerWithReports();
    await deliver(device, lockedToken(["unknown"]));
    await deliver(makeIdentity().pubkey, lockedToken(["p1"]));
    const payments = await loadPayments(evolu);
    expect(payments).toHaveLength(2);
    expect(payments.every(({ forwardedAtMs }) => forwardedAtMs === null)).toBe(
      true,
    );
    expect(calls).toHaveLength(2);
  });
});

describe("Nostr", () => {
  const sendFrom = async (
    sender: ReturnType<typeof makeIdentity>,
    message: AppMessage,
    to: ReturnType<typeof makeIdentity>["pubkey"],
  ) => {
    const published: SignedWrapEvent[] = [];
    await Effect.runPromise(
      Effect.flatMap(AppMessages, (messages) =>
        messages.send(appMessages.draft(to, message)),
      ).pipe(
        Effect.provide(
          AppMessages.Default.pipe(
            Layer.provide(
              Layer.mergeAll(
                LinkstrIdentity.fromSecretKey(sender.secretKey),
                RelayPolicy.fixed({
                  readRelays: [relay],
                  writeRelays: [relay],
                }),
                stubWrapTransport(published),
              ),
            ),
          ),
        ),
      ),
    );
    const wrap = published.find((event) => recipientOf(event) === to);
    if (!wrap) throw new Error("no wrap for the recipient");
    return wrap;
  };

  const deviceOnFakeRelay = async () => {
    const { evolu, keys, wallet } = await setup();
    const fake = new FakeRelay();
    const runtime = makeLinkstrRuntime(evolu, keys, {
      relays: [relay],
      allowInsecureLocalhostRelays: false,
      transport: Layer.succeed(
        NostrTransport,
        makeRelayPoolTransport(poolFor(new Map([[relay, fake]]))),
      ),
    });
    const nostr = createNostr(runtime, keys.nostr.pubkey, [relay]);
    return { evolu, keys, wallet, fake, nostr, runtime };
  };

  it("hands decoded app messages to their handlers", async () => {
    const { keys, fake, nostr, runtime } = await deviceOnFakeRelay();
    const received: AppMessage[] = [];
    nostr.onAppMessage((message) => {
      received.push(message);
    });
    const message: AppMessage = {
      v: 1,
      type: "EmployeeRemoved",
      shopId: "shop-1",
    };
    const wrap = await sendFrom(makeIdentity(), message, keys.nostr.pubkey);
    nostr.start();
    await Effect.runPromise(eventually(() => fake.subscriptions.length > 0));
    fake.eose();
    fake.emit(wrap);
    await Effect.runPromise(eventually(() => received.length === 1));
    expect(received).toEqual([message]);
    expect(nostr.nprofile).toMatch(/^nprofile1/u);
    await runtime.dispose();
  });

  it("closes a Linky withdrawal once a relay took its token", async () => {
    const { evolu, wallet, nostr, runtime } = await deviceOnFakeRelay();
    createWithdrawals({ evolu, nostr, wallet });
    const id = await createWithdrawal(evolu, {
      kind: "linky",
      target: "npub1test",
      amountSats: 100,
      operationId: "send-1",
    });
    nostr.start();
    await nostr.sendToken(
      makeIdentity().pubkey,
      tokenOf(100),
      `withdrawal:${id}`,
    );
    await expect
      .poll(async () => (await loadWithdrawals(evolu))[0]?.status, {
        timeout: 5_000,
      })
      .toBe("done");
    await runtime.dispose();
  });
});

describe("Linky withdrawals after a reload", () => {
  const recipient = makeIdentity().pubkey;

  const pendingSend = (id: string, tokenText: string) =>
    Schema.decodeUnknownSync(TokenTransfer)({
      id,
      kind: "send",
      status: "pending",
      tokenText,
      mint,
      unit: "sat",
      amount: 100,
      error: null,
      createdAt: 1_700_000_000,
    });

  /** An owner whose wallet holds `sends` and records the ones it returns. */
  const owner = async (
    sends: readonly TokenTransfer[],
    makeNostr: (evolu: AppEvolu, keys: DeviceKeys) => Nostr,
  ) => {
    const { evolu, keys, wallet } = await setup();
    const account = parseCzechAccount("19-2000145399/0800");
    if (Either.isLeft(account)) throw account.left;
    await saveShop(evolu, { name: "Kavárna", account: account.right });
    const nostr = makeNostr(evolu, keys);
    const returned: string[] = [];
    const withdrawals = createWithdrawals({
      evolu,
      nostr,
      wallet: {
        ...wallet,
        pendingSends: async () => sends,
        returnSend: async (operationId) => {
          returned.push(operationId);
          return true;
        },
      },
    });
    const linky = (operationId?: string) =>
      createWithdrawal(evolu, {
        kind: "linky",
        target: encodeNpub(recipient),
        amountSats: 100,
        ...(operationId ? { operationId } : {}),
      });
    return { evolu, nostr, withdrawals, returned, linky };
  };

  const sends = [
    pendingSend("send-1", tokenOf(100)),
    pendingSend("send-2", tokenOf(200)),
  ];

  it("queues a token a reload kept from the outbox, fails one cut off before its send, and returns a stray send", async () => {
    const queued: { to: Pubkey; token: string; ref: string }[] = [];
    const { evolu, withdrawals, returned, linky } = await owner(
      sends,
      () =>
        fakeNostr({
          sendToken: async (to, token, ref) => {
            queued.push({ to, token, ref });
            return new EnqueueReceipt({
              jobId: OutboxJobId.make(ref),
              ref: OutboxRef.make(ref),
              rumorId: RumorId.make("ef".repeat(32)),
              clientId: ClientId.make(ref),
              sentAt: UnixSeconds.make(1_700_000_000),
            });
          },
        }).nostr,
    );
    const resumed = await linky("send-1");
    const cutOff = await linky();
    withdrawals.start();
    await expect.poll(() => returned).toEqual(["send-2"]);
    expect(queued).toEqual([
      { to: recipient, token: tokenOf(100), ref: `withdrawal:${resumed}` },
    ]);
    const statusOf = async (id: string) =>
      (await loadWithdrawals(evolu)).find((withdrawal) => withdrawal.id === id);
    expect((await statusOf(resumed))?.status).toBe("pending");
    expect(await statusOf(cutOff)).toMatchObject({
      status: "failed",
      error: "Interrupted",
    });
  });

  it("does not queue a token the outbox still holds", async () => {
    const runtimes: LinkstrRuntime[] = [];
    const { evolu, nostr, withdrawals, returned, linky } = await owner(
      sends,
      (ownerEvolu, keys) => {
        const runtime = makeLinkstrRuntime(ownerEvolu, keys, {
          relays: [relay],
          allowInsecureLocalhostRelays: false,
          transport: Layer.succeed(
            NostrTransport,
            makeRelayPoolTransport(
              poolFor(new Map([[relay, new FakeRelay()]])),
            ),
          ),
        });
        runtimes.push(runtime);
        return createNostr(runtime, keys.nostr.pubkey, [relay]);
      },
    );
    const id = await linky("send-1");
    await nostr.sendToken(recipient, tokenOf(100), `withdrawal:${id}`);
    withdrawals.start();
    await expect.poll(() => returned).toEqual(["send-2"]);
    const jobs = await Effect.runPromise(makeEvoluOutboxStore(evolu).loadAll);
    expect(jobs.map(({ ref }) => ref)).toEqual([`withdrawal:${id}`]);
    await Promise.all(runtimes.map((runtime) => runtime.dispose()));
  });
});
