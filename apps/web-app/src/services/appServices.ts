import { createContext, use, useContext } from "react";
import type { AppEvolu, Identity } from "../storage";
import { createBitcoinPayments } from "./bitcoinPayments";
import type { BitcoinPayments } from "./bitcoinPayments";
import { receiveLockedTokens } from "./lockedTokens";
import { createNostr } from "./nostr";
import type { Nostr } from "./nostr";
import { loadCzkPerBtc } from "./rates";
import { makeLinkshuRuntime, makeLinkstrRuntime } from "./runtimes";
import type { RuntimeConfig } from "./runtimes";
import { createWallet } from "./wallet";
import type { Wallet } from "./wallet";
import { createWithdrawals } from "./withdrawals";
import type { Withdrawals } from "./withdrawals";

/** Everything that talks to relays and mints, one instance per install. */
export interface AppServices {
  readonly nostr: Nostr;
  readonly wallet: Wallet;
  readonly bitcoinPayments: BitcoinPayments;
  readonly withdrawals: Withdrawals;
  /** Opens the inbox and resumes interrupted payments; once. */
  readonly start: () => void;
  readonly dispose: () => Promise<void>;
}

export const createAppServices = (
  evolu: AppEvolu,
  { keys }: Identity,
  config: RuntimeConfig,
): AppServices => {
  const linkstr = makeLinkstrRuntime(evolu, keys, config);
  const linkshu = makeLinkshuRuntime(evolu, keys, config);
  const nostr = createNostr(linkstr, keys.nostr.pubkey, config.relays);
  const wallet = createWallet(linkshu, keys);
  const bitcoinPayments = createBitcoinPayments({
    evolu,
    nostr,
    wallet,
    czkPerBtc: loadCzkPerBtc,
  });
  const withdrawals = createWithdrawals({ evolu, nostr, wallet });
  receiveLockedTokens(nostr, wallet);
  return {
    nostr,
    wallet,
    bitcoinPayments,
    withdrawals,
    start: () => {
      nostr.start();
      bitcoinPayments.start();
      withdrawals.start();
    },
    dispose: async () => {
      await Promise.all([linkstr.dispose(), linkshu.dispose()]);
    },
  };
};

export const AppServicesContext = createContext<Promise<AppServices> | null>(
  null,
);

/** The install's services; suspends until the identity they run on is loaded. */
export const useAppServices = (): AppServices => {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error("useAppServices needs AppServicesContext");
  return use(services);
};
