import {
  makeRelayPoolTransport,
  NostrTransport,
  RelayUrl,
} from "@linky-fit/linkstr";
import type { RelayPool } from "@linky-fit/linkstr";
import { makeIdentity } from "@linky-fit/linkstr/testing";
import { Duration, Layer } from "effect";
import type { Event as NostrEvent } from "nostr-tools";
import { describe, expect, it } from "vitest";
import { loadIdentity } from "../storage";
import { createTestEvolu } from "../storage/testing/testEvolu";
import { createEmployeeLink } from "./employeeLogin";
import type { Publication } from "./employeeLogin";
import { createNostr } from "./nostr";
import { makeLinkstrRuntime } from "./runtimes";

const relay = RelayUrl.make("wss://relay.test");

/** A relay that stores what it is sent but never acknowledges it, and answers queries from the store when `keeps`. */
const silentRelay = (keeps: boolean): RelayPool => {
  const stored: NostrEvent[] = [];
  return {
    ensureRelay: async () => ({
      publish: (event) => {
        if (keeps) stored.push(event);
        return new Promise(() => {});
      },
      subscribe: (_filters, params) => {
        setTimeout(() => {
          for (const event of stored) params.onevent(event);
          params.oneose?.();
        });
        return { close: () => {} };
      },
    }),
  };
};

const waitingDevice = async (pool: RelayPool) => {
  const evolu = createTestEvolu();
  const { keys } = await loadIdentity(evolu);
  const runtime = makeLinkstrRuntime(evolu, keys, {
    relays: [relay],
    allowInsecureLocalhostRelays: false,
    transport: Layer.succeed(
      NostrTransport,
      makeRelayPoolTransport(pool, {
        publishTimeout: Duration.millis(50),
        fetchEoseTimeout: Duration.millis(200),
      }),
    ),
  });
  const link = createEmployeeLink({
    evolu,
    nostr: createNostr(runtime, keys.nostr.pubkey, [relay]),
    relays: [relay],
  });
  const states: Publication[] = [];
  const stop = link.keepPublished(
    {
      employeePubkey: makeIdentity().pubkey,
      attestation: '{"kind":24138}',
    },
    (state) => states.push(state),
  );
  return { states, stop, runtime };
};

describe("EmployeeLink.keepPublished", () => {
  it("counts an attestation the relay stored as published, although it never acknowledged it", async () => {
    const { states, stop, runtime } = await waitingDevice(silentRelay(true));
    await expect.poll(() => states, { timeout: 5_000 }).toContain("published");
    expect(states).toEqual(["publishing", "published"]);
    stop();
    await runtime.dispose();
  });

  it("keeps retrying while no relay holds it", async () => {
    const { states, stop, runtime } = await waitingDevice(silentRelay(false));
    await expect.poll(() => states, { timeout: 5_000 }).toContain("retrying");
    expect(states).not.toContain("published");
    stop();
    await runtime.dispose();
  });
});
