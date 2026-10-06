import {
  OperationId,
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
  TokenTransfer,
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
  /** Whether `operationId` is a receive that finished, so its sats are in the wallet. */
  readonly isReceived: (operationId: string) => Promise<boolean>;
  /** Takes an undelivered send's token back into the balance; `false` when it has to be tried again. */
  readonly returnSend: (operationId: string) => Promise<boolean>;
  /** Sends whose token has not been confirmed delivered or taken back. */
  readonly pendingSends: () => Promise<readonly TokenTransfer[]>;
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
  const transfers = () =>
    runtime.runPromise(Effect.flatMap(Tokens, (tokens) => tokens.transfers));
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
    isReceived: async (operationId) =>
      (await transfers()).some(
        (transfer) =>
          transfer.id === operationId &&
          transfer.kind === "receive" &&
          transfer.status === "done",
      ),
    returnSend: async (operationId) => {
      const returned = await run(
        Effect.flatMap(Tokens, (tokens) =>
          tokens.returnToWallet(OperationId.make(operationId)),
        ),
      );
      if (Either.isLeft(returned)) {
        console.warn("send not returned", returned.left);
      }
      return Either.isRight(returned);
    },
    pendingSends: async () =>
      (await transfers()).filter(
        (transfer) => transfer.kind === "send" && transfer.status === "pending",
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
