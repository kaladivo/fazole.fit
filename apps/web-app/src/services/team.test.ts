import {
  AppMessageReceived,
  ClientId,
  EnqueueReceipt,
  makeRelayPoolTransport,
  NostrTransport,
  OutboxJobFailed,
  OutboxJobId,
  OutboxRef,
  Pubkey,
  RelayUrl,
  RumorId,
  UnixSeconds,
} from "@linky-fit/linkstr";
import type { OutboxResult } from "@linky-fit/linkstr";
import { FakeRelay, makeIdentity, poolFor } from "@linky-fit/linkstr/testing";
import { Layer } from "effect";
import {
  appMessages,
  CzechIban,
  CzkAmount,
  PaymentId,
} from "@platitprosim/core";
import type { AppMessage, PaymentRecord, ShopConfig } from "@platitprosim/core";
import { describe, expect, it } from "vitest";
import {
  addEmployee,
  completePayment,
  createPayment,
  linkEmployeeDevice,
  loadEmployeeDevices,
  loadEmployees,
  loadPayments,
  loadShopOffers,
  loadStoredMembership,
  markEmployeeRemoved,
  reportedPaymentIdFor,
  saveEmployeeLogin,
  saveMembership,
  declineShopOffer,
  attachForward,
  loadIdentity,
  markMembershipRemoved,
} from "../storage";
import type { AppEvolu } from "../storage";
import { createTestEvolu } from "../storage/testing/testEvolu";
import { receiveMembershipMessages } from "./employeeLogin";
import { createEmployeeSync } from "./employeeSync";
import { createNostr } from "./nostr";
import { makeLinkstrRuntime } from "./runtimes";
import type { Sweep, SweepResult } from "./employeeSync";
import { createShopTeam } from "./shopTeam";
import { fakeNostr } from "./testing/fakes";

const owner = makeIdentity().pubkey;
const device = makeIdentity().pubkey;
const employeeKey = makeIdentity().pubkey;

const received = (from: Pubkey, message: AppMessage) =>
  new AppMessageReceived({
    messageId: RumorId.make("cd".repeat(32)),
    from,
    app: appMessages.app,
    content: JSON.stringify(message),
    clientId: null,
    sentAt: UnixSeconds.make(1_700_000_000),
  });

const record = (overrides: Partial<PaymentRecord> = {}): PaymentRecord => ({
  v: 1,
  type: "PaymentRecord",
  paymentId: PaymentId.make("pay-1"),
  amountCzk: CzkAmount.make(12_050),
  method: "bank",
  status: "pending",
  createdAt: 1_000,
  updatedAt: 1_000,
  ...overrides,
});

const shopConfig = (overrides: Partial<ShopConfig> = {}): ShopConfig => ({
  v: 1,
  type: "ShopConfig",
  shopId: owner,
  shopName: "Kavárna",
  iban: CzechIban.make("CZ6508000000192000145399"),
  accountDisplay: "19-2000145399/0800",
  ownerPubkey: owner,
  mintUrl: "http://localhost:3348",
  employeeName: "Jana",
  ...overrides,
});

const receipt = (ref: string) =>
  new EnqueueReceipt({
    jobId: OutboxJobId.make(ref),
    ref: OutboxRef.make(ref),
    rumorId: RumorId.make("ef".repeat(32)),
    clientId: ClientId.make(ref),
    sentAt: UnixSeconds.make(1_700_000_000),
  });

/** A fake Nostr whose app-message sends are recorded. */
const recordingNostr = () => {
  const sent: { to: Pubkey; message: AppMessage; ref: string }[] = [];
  const fake = fakeNostr({
    sendAppMessage: async (to, message, ref) => {
      sent.push({ to, message, ref });
      return receipt(ref);
    },
  });
  const deliver = async (...messages: [Pubkey, AppMessage][]) => {
    for (const [from, message] of messages) {
      for (const handler of fake.appMessages) {
        await handler(message, received(from, message));
      }
    }
  };
  const finish = async (result: OutboxResult) => {
    for (const { refPrefix, handler } of fake.outbox) {
      if (result.ref.startsWith(refPrefix)) await handler(result);
    }
  };
  return { ...fake, sent, deliver, finish };
};

const ownerWithEmployee = async () => {
  const evolu = createTestEvolu();
  await addEmployee(evolu, { pubkey: employeeKey, name: "Jana" });
  const [employee] = await loadEmployees(evolu);
  if (!employee) throw new Error("no employee");
  await linkEmployeeDevice(evolu, { employeeId: employee.id, pubkey: device });
  const nostr = recordingNostr();
  createShopTeam({ evolu, nostr: nostr.nostr });
  return { evolu, employee, ...nostr };
};

const reported = async (evolu: AppEvolu) =>
  (await loadPayments(evolu)).find(
    (payment) => payment.id === reportedPaymentIdFor(device, "pay-1"),
  );

describe("PaymentRecord on the owner", () => {
  it("stores a linked device's payment under its employee", async () => {
    const { evolu, employee, deliver } = await ownerWithEmployee();
    await deliver([device, record()]);
    expect(await reported(evolu)).toMatchObject({
      amountCzk: 12_050,
      status: "pending",
      createdBy: device,
      employeeId: employee.id,
    });
  });

  it("keeps the newest state, whatever order and however often records arrive", async () => {
    const { evolu, deliver } = await ownerWithEmployee();
    const paid = record({ status: "paid", updatedAt: 3_000, paidAt: 3_000 });
    await deliver(
      [device, record({ updatedAt: 2_000, status: "cancelled" })],
      [device, paid],
      [device, record()],
      [device, paid],
    );
    expect(await reported(evolu)).toMatchObject({
      status: "paid",
      updatedAtMs: 3_000,
      paidAtMs: 3_000,
    });
    expect(await loadPayments(evolu)).toHaveLength(1);
  });

  it("ignores unknown devices and removed employees", async () => {
    const { evolu, employee, deliver } = await ownerWithEmployee();
    await deliver([makeIdentity().pubkey, record()]);
    expect(await loadPayments(evolu)).toEqual([]);
    await markEmployeeRemoved(evolu, employee.id);
    await deliver([device, record()]);
    expect(await loadPayments(evolu)).toEqual([]);
  });

  it("tells every device of a removed employee", async () => {
    const { evolu, employee, nostr, sent } = await ownerWithEmployee();
    const team = createShopTeam({ evolu, nostr });
    await team.removeEmployee(employee);
    expect(sent).toEqual([
      {
        to: device,
        message: { v: 1, type: "EmployeeRemoved", shopId: nostr.pubkey },
        ref: `employeeRemoved:${device}`,
      },
    ]);
    expect((await loadEmployees(evolu))[0]?.removedAtMs).not.toBeNull();
    expect((await loadEmployeeDevices(evolu))[0]?.revokedAtMs).not.toBeNull();
  });

  it("never trusts a removed employee's device again, also once they are re-added", async () => {
    const { evolu, employee, nostr, deliver } = await ownerWithEmployee();
    await createShopTeam({ evolu, nostr }).removeEmployee(employee);
    await addEmployee(evolu, { pubkey: employeeKey, name: "Jana" });
    await deliver([device, record()]);
    expect(await loadPayments(evolu)).toEqual([]);
  });
});

describe("ShopConfig and EmployeeRemoved on an employee device", () => {
  const loggedIn = async () => {
    const evolu = createTestEvolu();
    await saveEmployeeLogin(evolu, {
      employeePubkey: employeeKey,
      attestation: "{}",
    });
    const nostr = recordingNostr();
    receiveMembershipMessages(evolu, nostr.nostr);
    return { evolu, ...nostr };
  };

  it("keeps a config as an offer until the employee answers", async () => {
    const { evolu, deliver } = await loggedIn();
    await deliver([owner, shopConfig()]);
    expect(await loadShopOffers(evolu)).toMatchObject([
      { ownerPubkey: owner, declined: false, config: shopConfig() },
    ]);
    expect(await loadStoredMembership(evolu)).toBeNull();
  });

  it("ignores a config whose sender is not its owner, or before a login", async () => {
    const { evolu, deliver } = await loggedIn();
    await deliver([makeIdentity().pubkey, shopConfig()]);
    expect(await loadShopOffers(evolu)).toEqual([]);
    const fresh = createTestEvolu();
    const nostr = recordingNostr();
    receiveMembershipMessages(fresh, nostr.nostr);
    await nostr.deliver([owner, shopConfig()]);
    expect(await loadShopOffers(fresh)).toEqual([]);
  });

  it("ignores an owner the employee declined", async () => {
    const { evolu, deliver } = await loggedIn();
    await deliver([owner, shopConfig()]);
    const [offer] = await loadShopOffers(evolu);
    if (!offer) throw new Error("no offer");
    await declineShopOffer(evolu, offer.id);
    await deliver([owner, shopConfig({ shopName: "Kavárna 2" })]);
    expect(await loadShopOffers(evolu)).toMatchObject([
      { declined: true, config: { shopName: "Kavárna" } },
    ]);
  });

  it("updates the membership from its owner and ends it on removal", async () => {
    const { evolu, deliver } = await loggedIn();
    await saveMembership(evolu, shopConfig(), employeeKey);
    const other = makeIdentity().pubkey;
    await deliver(
      [owner, shopConfig({ shopName: "Kavárna Nová" })],
      [other, shopConfig({ ownerPubkey: other, shopId: other })],
      [other, { v: 1, type: "EmployeeRemoved", shopId: other }],
    );
    expect(await loadStoredMembership(evolu)).toMatchObject({
      shopName: "Kavárna Nová",
      removed: false,
    });
    expect(await loadShopOffers(evolu)).toEqual([]);
    await deliver([owner, { v: 1, type: "EmployeeRemoved", shopId: owner }]);
    expect((await loadStoredMembership(evolu))?.removed).toBe(true);
  });
});

describe("employee sync", () => {
  const member = async (sweeps: SweepResult[]) => {
    const evolu = createTestEvolu();
    await saveMembership(evolu, shopConfig(), employeeKey);
    const nostr = recordingNostr();
    const sweepCalls: string[] = [];
    const sweep: Sweep = async (mint) => {
      sweepCalls.push(mint);
      const next = sweeps.shift();
      return next === undefined ? "retry" : next;
    };
    const sync = createEmployeeSync({
      evolu,
      nostr: nostr.nostr,
      sweep,
      forgetSend: async () => {},
    });
    return { evolu, sync, sweepCalls, ...nostr };
  };

  const paidLightning = async (evolu: AppEvolu) => {
    const id = await createPayment(evolu, {
      amountCzk: CzkAmount.make(2_500),
      createdBy: device,
    });
    const payment = (await loadPayments(evolu)).find(
      (stored) => stored.id === id,
    );
    if (!payment) throw new Error("no payment");
    await completePayment(evolu, payment, "lightning");
    return id;
  };

  const paymentOf = async (evolu: AppEvolu, id: string) =>
    (await loadPayments(evolu)).find((payment) => payment.id === id);

  it("reports each state of a payment once", async () => {
    const { evolu, sync, sent } = await member([null]);
    const id = await createPayment(evolu, {
      amountCzk: CzkAmount.make(2_500),
      createdBy: device,
    });
    await sync.sync(true);
    await sync.sync(false);
    const payment = await paymentOf(evolu, id);
    if (!payment) throw new Error("no payment");
    await completePayment(evolu, payment, "bank", payment.createdAtMs + 1);
    await sync.sync(false);
    expect(
      sent.map(({ to, message }) => [
        to,
        message.type,
        "status" in message ? message.status : null,
      ]),
    ).toEqual([
      [owner, "PaymentRecord", "pending"],
      [owner, "PaymentRecord", "paid"],
    ]);
  });

  it("sweeps a Bitcoin payment to the owner and marks it once a relay took it", async () => {
    const evolu = createTestEvolu();
    const { keys } = await loadIdentity(evolu);
    await saveMembership(evolu, shopConfig(), employeeKey);
    const relay = RelayUrl.make("wss://relay.test");
    const runtime = makeLinkstrRuntime(evolu, keys, {
      relays: [relay],
      allowInsecureLocalhostRelays: false,
      transport: Layer.succeed(
        NostrTransport,
        makeRelayPoolTransport(poolFor(new Map([[relay, new FakeRelay()]]))),
      ),
    });
    const nostr = createNostr(runtime, keys.nostr.pubkey, [relay]);
    const forgotten: string[] = [];
    const sync = createEmployeeSync({
      evolu,
      nostr,
      sweep: async () => ({ tokenText: "cashuBlocked", operationId: "send-1" }),
      forgetSend: async (operationId) => {
        forgotten.push(operationId);
      },
    });
    nostr.start();
    const id = await paidLightning(evolu);
    await sync.sync(true);
    expect((await paymentOf(evolu, id))?.lockedToken).toBe("cashuBlocked");
    await expect
      .poll(async () => (await paymentOf(evolu, id))?.forwardedAtMs, {
        timeout: 5_000,
      })
      .toBeGreaterThan(0);
    expect(forgotten).toEqual(["send-1"]);
    await runtime.dispose();
  });

  it("queues the swept token to the owner", async () => {
    const { evolu, sync, sent } = await member([
      { tokenText: "cashuBlocked", operationId: "send-1" },
    ]);
    const id = await paidLightning(evolu);
    await sync.sync(true);
    expect(sent.find(({ message }) => message.type === "LockedToken")).toEqual({
      to: owner,
      message: {
        v: 1,
        type: "LockedToken",
        paymentId: id,
        token: "cashuBlocked",
      },
      ref: `forward:${id}`,
    });
  });

  it("asks the mint again until the sweep goes through", async () => {
    const { evolu, sync, sent, sweepCalls } = await member([
      "retry",
      { tokenText: "cashuBlocked", operationId: "send-1" },
    ]);
    const id = await paidLightning(evolu);
    await sync.sync(true);
    expect((await paymentOf(evolu, id))?.lockedToken).toBeNull();
    await sync.sync(false);
    expect(sweepCalls).toHaveLength(2);
    expect(
      sent.filter(({ message }) => message.type === "LockedToken"),
    ).toHaveLength(1);
    await sync.sync(false);
    expect(sweepCalls).toHaveLength(2);
  });

  it("marks a payment an earlier sweep already took", async () => {
    const { evolu, sync, sent } = await member([null]);
    const id = await paidLightning(evolu);
    await sync.sync(true);
    expect((await paymentOf(evolu, id))?.forwardedAtMs).not.toBeNull();
    expect(sent.some(({ message }) => message.type === "LockedToken")).toBe(
      false,
    );
  });

  it("queues a stored token again after a restart, without sweeping again", async () => {
    const { evolu, sync, sent, sweepCalls } = await member([]);
    const id = await paidLightning(evolu);
    await attachForward(evolu, id, {
      token: "cashuBlocked",
      operationId: "send-1",
    });
    await sync.sync(false);
    expect(sent.some(({ message }) => message.type === "LockedToken")).toBe(
      false,
    );
    await sync.sync(true);
    expect(
      sent.filter(({ message }) => message.type === "LockedToken"),
    ).toHaveLength(1);
    expect(sweepCalls).toEqual([]);
  });

  it("queues the token again when the outbox gave up on it", async () => {
    const { evolu, sync, sent, finish } = await member([
      { tokenText: "cashuBlocked", operationId: "send-1" },
    ]);
    const id = await paidLightning(evolu);
    await sync.sync(true);
    await finish(
      new OutboxJobFailed({
        jobId: OutboxJobId.make("j"),
        ref: OutboxRef.make(`forward:${id}`),
        reason: "unexpected-error",
        detail: "boom",
      }),
    );
    await sync.sync(true);
    expect(
      sent.filter(({ message }) => message.type === "LockedToken"),
    ).toHaveLength(2);
    expect((await paymentOf(evolu, id))?.forwardedAtMs).toBeNull();
  });

  it("still forwards funds, but reports nothing, once removed", async () => {
    const { evolu, sync, sent } = await member([
      { tokenText: "cashuBlocked", operationId: "send-1" },
    ]);
    await paidLightning(evolu);
    await markMembershipRemoved(evolu);
    await sync.sync(true);
    expect(sent.map(({ message }) => message.type)).toEqual(["LockedToken"]);
  });
});
