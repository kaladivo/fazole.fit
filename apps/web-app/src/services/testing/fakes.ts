import {
  makeInMemoryKeyValueStore,
  makeInMemoryOperationStore,
  makeInMemoryProofStore,
  KeyValueStore,
  OperationStore,
  ProofStore,
} from "@linky-fit/linkshu";
import type { ReceiveError, ReceiveReceipt } from "@linky-fit/linkshu";
import { Pubkey } from "@linky-fit/linkstr";
import type { Either } from "effect";
import { Layer } from "effect";
import type {
  AppMessageHandler,
  InboxHandler,
  Nostr,
  OutboxResultHandler,
} from "../nostr";
import type { Wallet } from "../wallet";

/** linkshu stores that live as long as the test, so two runtimes can share them. */
export const memoryWalletStores = () => ({
  keyValueStore: Layer.succeed(KeyValueStore, makeInMemoryKeyValueStore()),
  proofStore: Layer.succeed(ProofStore, makeInMemoryProofStore()),
  operationStore: Layer.succeed(OperationStore, makeInMemoryOperationStore()),
});

/** A `Nostr` that only records handlers; tests call them directly. */
export const fakeNostr = (overrides: Partial<Nostr> = {}) => {
  const inbox: InboxHandler[] = [];
  const appMessages: AppMessageHandler[] = [];
  const outbox: { refPrefix: string; handler: OutboxResultHandler }[] = [];
  const nostr: Nostr = {
    pubkey: Pubkey.make("a".repeat(64)),
    nprofile: "nprofile1test",
    run: () => Promise.reject(new Error("fake nostr")),
    sendAppMessage: () => Promise.reject(new Error("fake nostr")),
    sendToken: () => Promise.reject(new Error("fake nostr")),
    publishName: () => Promise.resolve(),
    onInboxEvent: (handler) => {
      inbox.push(handler);
      return () => {};
    },
    onAppMessage: (handler) => {
      appMessages.push(handler);
      return () => {};
    },
    onOutboxResult: (refPrefix, handler) => {
      outbox.push({ refPrefix, handler });
      return () => {};
    },
    start: () => {},
    ...overrides,
  };
  return { nostr, inbox, appMessages, outbox };
};

/** Wraps a wallet so `receive` answers from `answer` and records its calls. */
export const scriptedReceive = (
  wallet: Wallet,
  answer: (text: string) => Either.Either<ReceiveReceipt, ReceiveError>,
) => {
  const calls: { text: string; unlock: boolean }[] = [];
  const scripted: Wallet = {
    ...wallet,
    receive: async (text, options) => {
      calls.push({ text, unlock: options?.unlock === true });
      return answer(text);
    },
  };
  return { wallet: scripted, calls };
};
