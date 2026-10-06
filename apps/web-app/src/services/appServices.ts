import { OperationId, Tokens } from "@linky-fit/linkshu";
import { Effect } from "effect";
import { createContext, use, useContext } from "react";
import type { AppEvolu, Identity } from "../storage";
import { createBitcoinPayments } from "./bitcoinPayments";
import { createEmployeeLink, receiveMembershipMessages } from "./employeeLogin";
import type { EmployeeLink } from "./employeeLogin";
import { createEmployeeSync, createSweep } from "./employeeSync";
import type { BitcoinPayments } from "./bitcoinPayments";
import { receiveLockedTokens } from "./lockedTokens";
import { createNostr } from "./nostr";
import type { Nostr } from "./nostr";
import { createProfileLookup } from "./profiles";
import type { ProfileLookup } from "./profiles";
import { loadCzkPerBtc } from "./rates";
import { makeLinkshuRuntime, makeLinkstrRuntime } from "./runtimes";
import type { RuntimeConfig } from "./runtimes";
import { createShopTeam } from "./shopTeam";
import type { ShopTeam } from "./shopTeam";
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
  readonly profiles: ProfileLookup;
  /** Employee install: the Linky login. */
  readonly employeeLink: EmployeeLink;
  /** Owner install: employees' devices and their payments. */
  readonly team: ShopTeam;
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
  receiveLockedTokens(evolu, nostr, wallet);
  receiveMembershipMessages(evolu, nostr);
  const team = createShopTeam({ evolu, nostr });
  const employeeSync = createEmployeeSync({
    evolu,
    nostr,
    sweep: createSweep(evolu, wallet),
    forgetSend: async (operationId) => {
      await wallet.run(
        Effect.flatMap(Tokens, (tokens) =>
          tokens.forget(OperationId.make(operationId)),
        ),
      );
    },
    pendingSends: wallet.pendingSends,
  });
  return {
    nostr,
    wallet,
    bitcoinPayments,
    withdrawals,
    profiles: createProfileLookup(nostr),
    employeeLink: createEmployeeLink({ evolu, nostr, relays: config.relays }),
    team,
    start: () => {
      nostr.start();
      bitcoinPayments.start();
      withdrawals.start();
      team.start();
      employeeSync.start();
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
