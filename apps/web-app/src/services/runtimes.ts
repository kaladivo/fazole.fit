import { Bip39Seed, Inspector, linkshuServices } from "@linky-fit/linkshu";
import type { LinkshuServicesConfig } from "@linky-fit/linkshu";
import {
  linkstrServices,
  makeNostrTransportSimplePool,
  RelayUrl,
} from "@linky-fit/linkstr";
import type { NostrTransport } from "@linky-fit/linkstr";
import type { DeviceKeys } from "@platitprosim/core";
import { Layer, ManagedRuntime, Schema } from "effect";
import type { appConfig } from "../config";
import { linkshuStores, linkstrStores } from "../storage";
import type { AppEvolu } from "../storage";

export interface RuntimeConfig {
  readonly relays: readonly RelayUrl[];
  readonly allowInsecureLocalhostRelays: boolean;
  /** The relay connection; tests pass a fake. */
  readonly transport?: Layer.Layer<NostrTransport> | undefined;
  /** linkshu's stores; tests pass in-memory ones. */
  readonly walletStores?: Omit<LinkshuServicesConfig, "bip39Seed"> | undefined;
}

export const runtimeConfigFrom = (config: typeof appConfig): RuntimeConfig => ({
  relays: config.nostrRelays.filter(Schema.is(RelayUrl)),
  allowInsecureLocalhostRelays: config.allowInsecureLocalhostRelays,
});

/** linkstr on the device key, with its outbox and inbox cursor in Evolu. */
export const makeLinkstrRuntime = (
  evolu: AppEvolu,
  keys: DeviceKeys,
  config: RuntimeConfig,
) =>
  ManagedRuntime.make(
    linkstrServices({
      secretKey: keys.nostr.secretKey,
      readRelays: config.relays,
      writeRelays: config.relays,
      transport:
        config.transport ??
        makeNostrTransportSimplePool({
          allowInsecureLocalhost: config.allowInsecureLocalhostRelays,
        }),
      ...linkstrStores(evolu, keys.nostr.pubkey),
    }),
  );

export type LinkstrRuntime = ReturnType<typeof makeLinkstrRuntime>;

/** linkshu on the device's BIP-39 seed, with its proofs, operations and counters in Evolu. */
export const makeLinkshuRuntime = (
  evolu: AppEvolu,
  keys: DeviceKeys,
  config: RuntimeConfig,
) =>
  ManagedRuntime.make(
    linkshuServices({
      bip39Seed: Bip39Seed.make(keys.bip39Seed),
      ...(config.walletStores ?? linkshuStores(evolu)),
    }).pipe(Layer.provideMerge(Inspector.disabled)),
  );

export type LinkshuRuntime = ReturnType<typeof makeLinkshuRuntime>;
