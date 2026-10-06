import {
  CashuTokenText,
  encodeNprofile,
  Outbox,
  OutboxRef,
  ProfileMetadata,
  Profiles,
  RelayHealth,
  TokenMessageDraft,
  UnixSeconds,
  WrapInbox,
} from "@linky-fit/linkstr";
import type {
  AppMessageReceived,
  EnqueueReceipt,
  InboxDelivery,
  LinkstrServices,
  OutboxResult,
  Pubkey,
  RelayHealthSnapshot,
  RelayUrl,
  RumorFixedOperation,
  WrapInboxEvent,
} from "@linky-fit/linkstr";
import { appMessages } from "@platitprosim/core";
import type { AppMessage } from "@platitprosim/core";
import { Cause, Effect, Fiber, Option, Stream } from "effect";
import type { LinkstrRuntime } from "./runtimes";

/** A first session with no stored cursor reads this far back. */
const LOOKBACK_SECONDS = 3 * 24 * 60 * 60;

/**
 * Handles one inbox event. The event is acknowledged once every handler
 * resolved; a rejection leaves it for the next session to replay, so
 * handlers must be idempotent.
 */
export type InboxHandler = (
  event: WrapInboxEvent,
  delivery: InboxDelivery,
) => Promise<void> | void;

export type AppMessageHandler = (
  message: AppMessage,
  event: AppMessageReceived,
) => Promise<void> | void;

/** Handles a finished outbox job; it is acknowledged once the handler resolved. */
export type OutboxResultHandler = (
  result: OutboxResult,
) => Promise<void> | void;

/** This device on Nostr: one inbox read while the app is open, one durable outbox. */
export interface Nostr {
  readonly pubkey: Pubkey;
  /** The device's nprofile with the app relays, where customers' wallets send tokens. */
  readonly nprofile: string;
  readonly run: <A, E>(
    effect: Effect.Effect<A, E, LinkstrServices>,
    options?: { readonly signal?: AbortSignal },
  ) => Promise<A>;
  /** Runs a long-lived effect, such as a watch, until the returned stop is called. */
  readonly fork: (
    effect: Effect.Effect<unknown, unknown, LinkstrServices>,
    label: string,
  ) => () => void;
  /** Queues an app message; the outbox retries it until a relay takes it. */
  readonly sendAppMessage: (
    to: Pubkey,
    message: AppMessage,
    ref: string,
  ) => Promise<EnqueueReceipt>;
  /** Queues a Cashu token as a NIP-17 chat message, the way linky sends tokens. */
  readonly sendToken: (
    to: Pubkey,
    token: string,
    ref: string,
  ) => Promise<EnqueueReceipt>;
  /** Publishes the device's kind-0 name, so wallets show the shop instead of a stranger. */
  readonly publishName: (name: string) => Promise<void>;
  /** Calls `onChange` with every relay health snapshot until the returned stop is called. */
  readonly watchRelayHealth: (
    onChange: (health: RelayHealthSnapshot) => void,
  ) => () => void;
  readonly onInboxEvent: (handler: InboxHandler) => () => void;
  /** Every app message of the fazole.fit channel that matches its schema. */
  readonly onAppMessage: (handler: AppMessageHandler) => () => void;
  /** Results of jobs whose ref starts with `refPrefix`. */
  readonly onOutboxResult: (
    refPrefix: string,
    handler: OutboxResultHandler,
  ) => () => void;
  /** Opens the inbox and starts consuming outbox results; once. */
  readonly start: () => void;
}

const subscribe = <T>(handlers: Set<T>, handler: T) => {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
};

/** Runs every task and reports whether all of them succeeded. */
const settleAll = async (
  label: string,
  tasks: ReadonlyArray<() => Promise<void> | void>,
): Promise<boolean> => {
  const outcomes = await Promise.allSettled(tasks.map(async (task) => task()));
  const failures = outcomes.flatMap((outcome) =>
    outcome.status === "rejected" ? [outcome.reason] : [],
  );
  for (const reason of failures) console.warn(`${label} failed`, reason);
  return failures.length === 0;
};

const logDeath = (label: string) =>
  Effect.catchAllCause((cause: Cause.Cause<unknown>) =>
    Effect.sync(() => {
      if (!Cause.isInterruptedOnly(cause)) {
        console.warn(`${label} stopped`, Cause.pretty(cause));
      }
    }),
  );

export const createNostr = (
  runtime: LinkstrRuntime,
  pubkey: Pubkey,
  relays: readonly RelayUrl[],
): Nostr => {
  const inboxHandlers = new Set<InboxHandler>();
  const appMessageHandlers = new Set<AppMessageHandler>();
  const outboxHandlers = new Set<{
    readonly refPrefix: string;
    readonly handler: OutboxResultHandler;
  }>();

  inboxHandlers.add(async (event) => {
    if (event._tag !== "AppMessageReceived") return;
    const message = appMessages.decode(event);
    if (Option.isNone(message)) return;
    const handled = await settleAll(
      "app message handler",
      [...appMessageHandlers].map(
        (handler) => () => handler(message.value, event),
      ),
    );
    if (!handled) throw new Error("an app message handler failed");
  });

  const readInbox = Effect.scoped(
    Effect.gen(function* () {
      const inbox = yield* WrapInbox;
      const feed = yield* inbox.open({
        since: UnixSeconds.make(
          Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS,
        ),
      });
      yield* Stream.runForEach(feed.events, ({ event, delivery, ack }) =>
        Effect.promise(() =>
          settleAll(
            "inbox handler",
            [...inboxHandlers].map((handler) => () => handler(event, delivery)),
          ),
        ).pipe(Effect.flatMap((handled) => (handled ? ack : Effect.void))),
      );
    }),
  );

  const consumeOutbox = Effect.flatMap(Outbox, (outbox) =>
    Stream.runForEach(outbox.results, (result) =>
      Effect.promise(() =>
        settleAll(
          "outbox result handler",
          [...outboxHandlers].flatMap(({ refPrefix, handler }) =>
            result.ref.startsWith(refPrefix) ? [() => handler(result)] : [],
          ),
        ),
      ).pipe(
        Effect.flatMap((handled) =>
          handled ? outbox.ack(result.jobId) : Effect.void,
        ),
      ),
    ),
  );

  const enqueue = (operation: RumorFixedOperation, ref: string) =>
    runtime.runPromise(
      Effect.flatMap(Outbox, (outbox) =>
        outbox.enqueue(operation, OutboxRef.make(ref)),
      ),
    );

  let started = false;

  const fork = (
    effect: Effect.Effect<unknown, unknown, LinkstrServices | RelayHealth>,
    label: string,
  ) => {
    const fiber = runtime.runFork(effect.pipe(logDeath(label)));
    return () => {
      runtime.runFork(Fiber.interrupt(fiber));
    };
  };

  return {
    pubkey,
    nprofile: encodeNprofile(pubkey, relays),
    run: (effect, options) => runtime.runPromise(effect, options),
    fork,
    sendAppMessage: (to, message, ref) =>
      enqueue(
        { _tag: "appMessage", draft: appMessages.draft(to, message) },
        ref,
      ),
    sendToken: (to, token, ref) =>
      enqueue(
        {
          _tag: "chat.token",
          draft: new TokenMessageDraft({
            to,
            token: CashuTokenText.make(token),
          }),
        },
        ref,
      ),
    publishName: (name) =>
      runtime
        .runPromise(
          Effect.flatMap(Profiles, (profiles) =>
            profiles.publishProfile(
              new ProfileMetadata({ name, displayName: name }),
            ),
          ),
        )
        .then(
          () => undefined,
          (error: unknown) => console.warn("profile not published", error),
        ),
    watchRelayHealth: (onChange) =>
      fork(
        Effect.flatMap(RelayHealth, (health) =>
          Stream.runForEach(health.changes, (snapshot) =>
            Effect.sync(() => onChange(snapshot)),
          ),
        ),
        "relay health",
      ),
    onInboxEvent: (handler) => subscribe(inboxHandlers, handler),
    onAppMessage: (handler) => subscribe(appMessageHandlers, handler),
    onOutboxResult: (refPrefix, handler) =>
      subscribe(outboxHandlers, { refPrefix, handler }),
    start: () => {
      if (started) return;
      started = true;
      runtime.runFork(readInbox.pipe(logDeath("Nostr inbox")));
      runtime.runFork(consumeOutbox.pipe(logDeath("Nostr outbox")));
    },
  };
};
