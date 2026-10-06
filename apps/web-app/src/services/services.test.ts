import {
  DecodedToken,
  encodeToken,
  MintUnreachable,
  MintUrl,
  ReceiveReceipt,
  TokenAlreadyKnown,
} from "@linky-fit/linkshu";
import {
  AppMessageReceived,
  AppMessages,
  ChatMessageReceived,
  LinkstrIdentity,
  makeRelayPoolTransport,
  NostrTransport,
  RelayPolicy,
  RelayUrl,
  RumorId,
  TextBody,
  TokenBody,
  CashuTokenText,
  UnixSeconds,
} from "@linky-fit/linkstr";
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
  PaymentId,
  Sats,
} from "@platitprosim/core";
import type { AppMessage } from "@platitprosim/core";
import { Effect, Either, Layer, Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  attachBitcoinRequest,
  createPayment,
  createWithdrawal,
  loadIdentity,
  loadPayments,
  loadWithdrawals,
} from "../storage";
import type { AppEvolu } from "../storage";
import { createTestEvolu } from "../storage/testing/testEvolu";
import { createBitcoinPayments } from "./bitcoinPayments";
import { receiveLockedTokens } from "./lockedTokens";
import { createNostr } from "./nostr";
import { makeLinkshuRuntime, makeLinkstrRuntime } from "./runtimes";
import {
  fakeNostr,
  memoryWalletStores,
  scriptedReceive,
} from "./testing/fakes";
import { createWallet } from "./wallet";
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

const receipt = (amount: number) =>
  Schema.decodeUnknownSync(ReceiveReceipt)({
    operationId: "receive-1",
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
    ).toBe("rate-unavailable");
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
    ).toBe("mint-unreachable");
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
  const withHandler = async (answer: Parameters<typeof scriptedReceive>[1]) => {
    const { evolu, wallet } = await setup();
    const fake = fakeNostr();
    const scripted = scriptedReceive(wallet, answer);
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

  it("matches a NUT-18 payload in a text message by its request id", async () => {
    const { evolu, handler, id } = await withHandler(() =>
      Either.right(receipt(100)),
    );
    const payload = JSON.stringify({
      id,
      mint,
      unit: "sat",
      proofs: [{ id: "00ad268c4d1f5826", amount: 100, secret: "s", C: "02" }],
    });
    await handler(chatMessage(new TextBody({ text: payload })), "backfill");
    expect((await paymentById(evolu, id))?.status).toBe("paid");
  });

  it("never pays a payment with a replayed token", async () => {
    const { evolu, handler, id } = await withHandler(() =>
      Either.left(new TokenAlreadyKnown({ operationId: null })),
    );
    await handler(
      chatMessage(new TokenBody({ token: CashuTokenText.make(tokenOf(100)) })),
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
  const lockedToken: AppMessage = {
    v: 1,
    type: "LockedToken",
    paymentId: PaymentId.make("p1"),
    token: tokenOf(100),
  };

  it("receives the token with the device key", async () => {
    const { wallet } = await setup();
    const fake = fakeNostr();
    const scripted = scriptedReceive(wallet, () => Either.right(receipt(100)));
    receiveLockedTokens(fake.nostr, scripted.wallet);
    const [handler] = fake.appMessages;
    if (!handler) throw new Error("no app message handler");
    await handler(
      lockedToken,
      new AppMessageReceived({
        messageId: RumorId.make("cd".repeat(32)),
        from: makeIdentity().pubkey,
        app: appMessages.app,
        content: JSON.stringify(lockedToken),
        clientId: null,
        sentAt: UnixSeconds.make(1_700_000_000),
      }),
    );
    expect(scripted.calls).toEqual([{ text: lockedToken.token, unlock: true }]);
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
