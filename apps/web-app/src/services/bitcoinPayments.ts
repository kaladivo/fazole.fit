import {
  Amount,
  Mints,
  parseMintUrl,
  Topup,
  TopupDraft,
} from "@linky-fit/linkshu";
import type {
  MintUrl,
  TopupError,
  TopupHandle,
  TopupQuote,
  TopupReceipt,
} from "@linky-fit/linkshu";
import {
  buildCashuRequest,
  czkToSats,
  matchIncomingCashu,
  matchRepeatedCashu,
  minimumBitcoinSats,
  readIncomingCashu,
  uniqueRequestSats,
  wholeCzkFor,
} from "@platitprosim/core";
import type { CzkAmount, IncomingCashu } from "@platitprosim/core";
import { Effect, Either, ExecutionStrategy, Exit, Scope } from "effect";
import {
  attachBitcoinRequest,
  bitcoinRequestOf,
  clearBitcoinRequest,
  completePayment,
  hasReceipt,
  loadPayment,
  loadPaymentPaidBy,
  loadPayments,
  loadPaymentWithQuote,
  openBitcoinPayments,
  paidBitcoinPayments,
  recordReceipt,
} from "../storage";
import type { AppEvolu, Payment } from "../storage";
import type { InboxHandler, Nostr } from "./nostr";
import { exclusive, serialQueue } from "./serial";
import type { Wallet } from "./wallet";
import { isTransientReceiveError } from "./wallet";

/**
 * Why a payment could not get its Bitcoin leg: a missing rate or mint is
 * worth a retry, an amount below what the mint's fees allow is not.
 */
export type BitcoinRequestFailure =
  | { readonly reason: "rate-unavailable" | "mint-unreachable" }
  | { readonly reason: "below-minimum"; readonly minimumCzk: CzkAmount };

/**
 * Takes Bitcoin payments on this device: a Lightning quote and a Cashu
 * request per payment, settled by whichever the customer pays first. Sats
 * that arrive for a payment already paid are recorded as a receipt.
 */
export interface BitcoinPayments {
  /**
   * Gives a payment its Bitcoin leg unless it has one: the CZK amount in
   * sats at the current rate, made unique among the open requests, a NUT-20
   * locked mint quote at `mintUrl` and a NUT-18 request to this device,
   * stored on the payment row.
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
  // A new quote polls in a scope of its own, closed once Cashu pays its payment.
  const quoteScopes = new Map<string, Scope.CloseableScope>();
  const serially = serialQueue("bitcoin payments");
  // Settling one leg reads what the other one wrote.
  const settling = exclusive();

  const stopWatching = async (quoteId: string | null) => {
    const quoteScope = quoteId === null ? undefined : quoteScopes.get(quoteId);
    if (quoteId === null || quoteScope === undefined) return;
    quoteScopes.delete(quoteId);
    await Effect.runPromise(Scope.close(quoteScope, Exit.void));
  };

  /** Pays the quote's payment, or records the minted sats when another leg paid it first or no payment asks for them. */
  const recordMinted = async (minted: TopupReceipt) => {
    const payment = await loadPaymentWithQuote(evolu, minted.quoteId);
    if (payment && (await completePayment(evolu, payment, "lightning"))) {
      return;
    }
    // This quote paid it in an earlier session.
    if (payment?.status === "paid" && payment.method === "lightning") return;
    await recordReceipt(evolu, {
      operationId: minted.operationId,
      kind: "lightning",
      sats: minted.amount,
      ...(payment ? { paymentId: payment.id } : {}),
    });
  };

  const settleTopup = async (
    quote: TopupQuote,
    outcome: Either.Either<TopupReceipt, TopupError>,
  ) => {
    if (Either.isRight(outcome)) {
      await settling(() => recordMinted(outcome.right));
      return;
    }
    const payment = await loadPaymentWithQuote(evolu, quote.quoteId);
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
      quoteScopes.clear();
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

  const inputFeePpkAt = async (mint: MintUrl) => {
    const info = await wallet.run(
      Effect.flatMap(Mints, (mints) => mints.info(mint)),
    );
    return Either.isRight(info) ? info.right.inputFeePpk : null;
  };

  const startRequest = async (
    payment: Payment,
    shop: { readonly mintUrl: string; readonly name: string },
  ): Promise<BitcoinRequestFailure | null> => {
    // The row read by the caller may predate a request that just landed.
    const fresh = await loadPayment(evolu, payment.id);
    if (fresh === null || bitcoinRequestOf(fresh) !== null) return null;
    const rate = await czkPerBtc();
    if (rate === null) return { reason: "rate-unavailable" };
    const mint = parseMintUrl(shop.mintUrl);
    if (mint === null) return { reason: "mint-unreachable" };
    const priced = czkToSats(payment.amountCzk, rate);
    const minimum = minimumBitcoinSats(await inputFeePpkAt(mint));
    if (priced < minimum) {
      return {
        reason: "below-minimum",
        minimumCzk: wholeCzkFor(minimum, rate),
      };
    }
    // Serial, so two requests created at once never pick the same amount.
    const started = await serially(async () => {
      const sats = uniqueRequestSats(
        priced,
        openBitcoinPayments(await loadPayments(evolu)),
      );
      const quoteScope = Effect.runSync(
        Scope.fork(scope, ExecutionStrategy.sequential),
      );
      const topup = await runtime.runPromise(
        Effect.either(
          Scope.extend(
            Effect.flatMap(Topup, (topups) =>
              topups.start(
                new TopupDraft({
                  mint,
                  amount: Amount.make(sats),
                  description: shop.name,
                }),
                { lockingKey },
              ),
            ),
            quoteScope,
          ),
        ),
      );
      if (Either.isLeft(topup)) {
        await Effect.runPromise(Scope.close(quoteScope, Exit.void));
        return topup;
      }
      const { quote } = topup.right;
      quoteScopes.set(quote.quoteId, quoteScope);
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
      return topup;
    });
    if (started === undefined) return { reason: "mint-unreachable" };
    if (Either.isLeft(started)) {
      console.warn("payment quote failed", started.left);
      return { reason: "mint-unreachable" };
    }
    watch(started.right);
    return null;
  };

  const requests = new Map<string, Promise<BitcoinRequestFailure | null>>();

  /**
   * Receives a token and records what it put into the wallet: it pays the
   * payment it matches, also a cancelled one, a token for a paid payment
   * is recorded as paying it again, and one that matches none is kept as an
   * unassigned receipt.
   */
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
    const received = await unrecordedReceiveOf(text, incoming);
    if (received === null) return;
    const { operationId, sats } = received;
    await settling(async () => {
      const payments = await loadPayments(evolu);
      const paidBefore = await loadPaymentPaidBy(evolu, operationId);
      const paid =
        paidBefore ??
        matchIncomingCashu(incoming, openBitcoinPayments(payments))?.payment ??
        matchRepeatedCashu(incoming, paidBitcoinPayments(payments))?.payment ??
        null;
      // The payment first: a recorded receipt marks the token handled.
      if (paid && paid.status !== "paid") {
        await completePayment(evolu, paid, { cashuReceiveId: operationId });
        await stopWatching(paid.quoteId);
      }
      await recordReceipt(evolu, {
        operationId,
        kind: "cashu",
        sats,
        ...(paid ? { paymentId: paid.id } : {}),
      });
    });
  };

  /** Receives the text; the receive holding its sats, `null` when they are not there or already recorded. */
  const unrecordedReceiveOf = async (
    text: string,
    incoming: IncomingCashu,
  ): Promise<{
    readonly operationId: string;
    readonly sats: number;
  } | null> => {
    const received = await wallet.receive(text);
    if (Either.isRight(received)) {
      return {
        operationId: received.right.operationId,
        sats: received.right.amount,
      };
    }
    // Unacknowledged, so the next session receives it again.
    if (isTransientReceiveError(received.left)) throw received.left;
    if (received.left._tag !== "TokenAlreadyKnown") return null;
    // A replay, such as after a reload between receiving and recording; its net amount is gone, so the face value stands in.
    const { operationId } = received.left;
    return operationId !== null &&
      !(await hasReceipt(evolu, operationId)) &&
      (await wallet.isReceived(operationId))
      ? { operationId, sats: incoming.amount }
      : null;
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
