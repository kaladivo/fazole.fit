import { Amount, parseMintUrl, Topup, TopupDraft } from "@linky-fit/linkshu";
import type {
  TopupError,
  TopupHandle,
  TopupQuote,
  TopupReceipt,
} from "@linky-fit/linkshu";
import {
  buildCashuRequest,
  czkToSats,
  matchIncomingCashu,
  readIncomingCashu,
} from "@platitprosim/core";
import { Effect, Either, Exit, Scope } from "effect";
import {
  attachBitcoinRequest,
  bitcoinRequestOf,
  clearBitcoinRequest,
  completePayment,
  loadPayments,
  openBitcoinPayments,
} from "../storage";
import type { AppEvolu, Payment } from "../storage";
import type { InboxHandler, Nostr } from "./nostr";
import type { Wallet } from "./wallet";
import { isTransientReceiveError } from "./wallet";

/** Why a payment could not get its Bitcoin leg; both are worth a retry. */
export type BitcoinRequestFailure = "rate-unavailable" | "mint-unreachable";

/**
 * Takes Bitcoin payments on this device: a Lightning quote and a Cashu
 * request per payment, settled by whichever the customer pays first.
 */
export interface BitcoinPayments {
  /**
   * Gives a payment its Bitcoin leg unless it has one: the CZK amount in
   * sats at the current rate, a NUT-20 locked mint quote at `mintUrl` and
   * a NUT-18 request to this device, stored on the payment row.
   */
  readonly request: (
    payment: Payment,
    shop: { readonly mintUrl: string; readonly name: string },
  ) => Promise<BitcoinRequestFailure | null>;
  /** Watches every pending quote, also after a reload, and receives tokens sent to this device. */
  readonly start: () => void;
}

const RESUME_DELAY_MS = 30_000;

export const createBitcoinPayments = ({
  evolu,
  nostr,
  wallet,
  czkPerBtc,
}: {
  readonly evolu: AppEvolu;
  readonly nostr: Nostr;
  readonly wallet: Wallet;
  readonly czkPerBtc: () => Promise<number | null>;
}): BitcoinPayments => {
  const { runtime, lockingKey } = wallet;
  // Topup polling runs in this scope; closing it stops every poll, and the
  // persisted quotes resume in the next scope.
  let scope = Effect.runSync(Scope.make());
  let queue: Promise<void> = Promise.resolve();
  const serially = <A>(task: () => Promise<A>): Promise<A> => {
    const next = queue.then(task);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  const paymentWithQuote = async (quoteId: string) =>
    (await loadPayments(evolu)).find((payment) => payment.quoteId === quoteId);

  const settleTopup = async (
    quote: TopupQuote,
    outcome: Either.Either<TopupReceipt, TopupError>,
  ) => {
    const payment = await paymentWithQuote(quote.quoteId);
    if (Either.isRight(outcome)) {
      if (payment) await completePayment(evolu, payment, "lightning");
      return;
    }
    switch (outcome.left._tag) {
      case "QuoteExpired":
        if (payment?.status === "pending") {
          await clearBitcoinRequest(evolu, payment.id);
        }
        return;
      case "MintUnreachable":
      case "CounterLockTimeout":
        scheduleResume();
        return;
      case "MintRejected":
        console.warn("mint rejected a payment quote", outcome.left);
        return;
    }
  };

  const watch = (handle: TopupHandle) => {
    runtime.runPromise(Effect.either(handle.result)).then(
      (outcome) => settleTopup(handle.quote, outcome),
      // Interrupted by a resume, which watches the quote again.
      () => undefined,
    );
  };

  const resume = () =>
    serially(async () => {
      await Effect.runPromise(Scope.close(scope, Exit.void));
      scope = Effect.runSync(Scope.make());
      const handles = await runtime.runPromise(
        Scope.extend(
          Effect.flatMap(Topup, (topup) => topup.resumePending({ lockingKey })),
          scope,
        ),
      );
      handles.forEach(watch);
    });

  let resumeTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleResume = () => {
    if (resumeTimer !== null) return;
    resumeTimer = setTimeout(() => {
      resumeTimer = null;
      void resume();
    }, RESUME_DELAY_MS);
  };

  const startRequest = async (
    payment: Payment,
    shop: { readonly mintUrl: string; readonly name: string },
  ): Promise<BitcoinRequestFailure | null> => {
    // The row read by the caller may predate a request that just landed.
    const fresh = (await loadPayments(evolu)).find(
      (stored) => stored.id === payment.id,
    );
    if (fresh === undefined || bitcoinRequestOf(fresh) !== null) return null;
    const rate = await czkPerBtc();
    if (rate === null) return "rate-unavailable";
    const mint = parseMintUrl(shop.mintUrl);
    if (mint === null) return "mint-unreachable";
    const sats = czkToSats(payment.amountCzk, rate);
    const started = await serially(() =>
      runtime.runPromise(
        Effect.either(
          Scope.extend(
            Effect.flatMap(Topup, (topup) =>
              topup.start(
                new TopupDraft({
                  mint,
                  amount: Amount.make(sats),
                  description: shop.name,
                }),
                { lockingKey },
              ),
            ),
            scope,
          ),
        ),
      ),
    );
    if (Either.isLeft(started)) {
      console.warn("payment quote failed", started.left);
      return "mint-unreachable";
    }
    const { quote } = started.right;
    await attachBitcoinRequest(evolu, payment.id, {
      sats,
      czkPerBtc: rate,
      quoteId: quote.quoteId,
      invoice: quote.invoice,
      paymentRequest: buildCashuRequest({
        sats,
        mintUrl: mint,
        deviceNprofile: nostr.nprofile,
        paymentId: payment.id,
      }),
    });
    watch(started.right);
    return null;
  };

  const requests = new Map<string, Promise<BitcoinRequestFailure | null>>();

  const receiveChatToken: InboxHandler = async (event) => {
    if (event._tag !== "ChatMessageReceived" || event.editOf !== null) return;
    const text =
      event.body._tag === "TokenBody"
        ? event.body.token
        : event.body._tag === "TextBody"
          ? event.body.text
          : null;
    const incoming = text === null ? null : readIncomingCashu(text);
    if (text === null || incoming === null) return;
    const received = await wallet.receive(text);
    if (Either.isLeft(received)) {
      // Unacknowledged, so the next session receives it again.
      if (isTransientReceiveError(received.left)) throw received.left;
      return;
    }
    const paid = matchIncomingCashu(
      incoming,
      openBitcoinPayments(await loadPayments(evolu)),
    );
    if (paid) await completePayment(evolu, paid.payment, "cashu");
  };

  nostr.onInboxEvent(receiveChatToken);
  let started = false;

  return {
    request: (payment, shop) => {
      if (bitcoinRequestOf(payment) !== null) return Promise.resolve(null);
      const inflight = requests.get(payment.id);
      if (inflight) return inflight;
      const request = startRequest(payment, shop).finally(() =>
        requests.delete(payment.id),
      );
      requests.set(payment.id, request);
      return request;
    },
    start: () => {
      if (started) return;
      started = true;
      void resume();
      globalThis.addEventListener("online", () => void resume());
    },
  };
};
