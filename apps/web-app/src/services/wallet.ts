import {
  P2pkUnlockingKey,
  QuoteLockingKey,
  Receive,
  ReceiveDraft,
  Tokens,
} from "@linky-fit/linkshu";
import type {
  LinkshuServices,
  MintUrl,
  ReceiveError,
  ReceiveReceipt,
} from "@linky-fit/linkshu";
import type { DeviceKeys } from "@platitprosim/core";
import { Effect, Either } from "effect";
import type { LinkshuRuntime } from "./runtimes";

/** The device's Cashu wallet. */
export interface Wallet {
  readonly runtime: LinkshuRuntime;
  /** Runs a wallet effect; typed failures come back as `Left`, defects reject. */
  readonly run: <A, E>(
    effect: Effect.Effect<A, E, LinkshuServices>,
  ) => Promise<Either.Either<A, E>>;
  /** NUT-20: mint quotes are locked to the device key. */
  readonly lockingKey: QuoteLockingKey;
  /**
   * Receives a token or NUT-18 payload nobody asked for, such as one in a
   * message; `unlock` signs proofs P2PK-locked to the device key.
   */
  readonly receive: (
    text: string,
    options?: { readonly unlock?: boolean },
  ) => Promise<Either.Either<ReceiveReceipt, ReceiveError>>;
  /** The mint holding the most sats, which payouts spend from. */
  readonly richestMint: () => Promise<{
    readonly mint: MintUrl;
    readonly sats: number;
  } | null>;
}

/** Failures worth replaying the message for: the token may still be received later. */
export const isTransientReceiveError = (error: ReceiveError) =>
  error._tag === "MintUnreachable" ||
  error._tag === "ReceiveDeferred" ||
  error._tag === "CounterLockTimeout";

export const createWallet = (
  runtime: LinkshuRuntime,
  keys: DeviceKeys,
): Wallet => {
  const run: Wallet["run"] = (effect) =>
    runtime.runPromise(Effect.either(effect));
  const unlockingKey = P2pkUnlockingKey.make(keys.nostr.secretKeyHex);
  return {
    runtime,
    run,
    lockingKey: QuoteLockingKey.make(keys.nostr.secretKeyHex),
    receive: (text, options) =>
      run(
        Effect.flatMap(Receive, (receive) =>
          receive.receive(
            new ReceiveDraft({ text, automatic: true }),
            options?.unlock ? { unlockingKey } : {},
          ),
        ),
      ),
    richestMint: async () => {
      const balances = await runtime.runPromise(
        Effect.flatMap(Tokens, (tokens) => tokens.balances),
      );
      const [richest] = [...balances.perMint].sort(
        (a, b) => b.amount - a.amount,
      );
      return richest && richest.amount > 0
        ? { mint: richest.mint, sats: richest.amount }
        : null;
    },
  };
};
