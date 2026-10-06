import {
  Amount,
  Bolt11Invoice,
  fetchLnurlInvoiceForTarget,
  getPayableLightningInvoice,
  isLnurlPayTarget,
  Melt,
  MeltDraft,
  OperationId,
  Send,
  SendDraft,
  stripLightningPrefix,
  Tokens,
} from "@linky-fit/linkshu";
import type { MeltError, MeltQuote, SendError } from "@linky-fit/linkshu";
import { parseBip321Uri } from "@linky-fit/linkshu/payment-request";
import { decodeNpub, encodeNpub } from "@linky-fit/linkstr";
import type { Pubkey } from "@linky-fit/linkstr";
import { Effect, Either } from "effect";
import {
  attachWithdrawalSend,
  createWithdrawal,
  finishWithdrawal,
  loadOutboxRefs,
  loadOwnShop,
  loadWithdrawals,
} from "../storage";
import type { AppEvolu, WithdrawalId } from "../storage";
import type { Nostr } from "./nostr";
import { serialQueue } from "./serial";
import type { Wallet } from "./wallet";

/** Where a Lightning payout goes: an invoice to pay as is, or an address to ask for one. */
export type LightningTarget =
  | {
      readonly kind: "invoice";
      readonly invoice: Bolt11Invoice;
      readonly amountSats: number;
    }
  | { readonly kind: "address"; readonly target: string };

/** Reads a typed or scanned Lightning address, LNURL, invoice with an amount, or a `bitcoin:` URI's Lightning leg. */
export const parseLightningTarget = (text: string): LightningTarget | null => {
  const bip321 = parseBip321Uri(text.trim());
  const value = stripLightningPrefix(
    bip321?.lightning ?? bip321?.lnurl ?? bip321?.lnAddress ?? text.trim(),
  );
  if (/^ln(bc|tb|bcrt)/iu.test(value)) {
    const invoice = getPayableLightningInvoice(value.toLowerCase());
    return invoice
      ? {
          kind: "invoice",
          invoice: Bolt11Invoice.make(value.toLowerCase()),
          amountSats: invoice.amountSat,
        }
      : null;
  }
  return value !== "" && isLnurlPayTarget(value)
    ? { kind: "address", target: value }
    : null;
};

export type WithdrawFailure =
  | "lnurl-failed"
  | "insufficient-funds"
  | "mint-unreachable"
  | "payment-failed";

/** A priced Lightning payout, shown for confirmation before it is paid. */
export interface LightningPayout {
  readonly target: string;
  readonly invoice: Bolt11Invoice;
  readonly quote: MeltQuote;
}

/** The owner's ways to take money out of the wallet. */
export interface Withdrawals {
  /** Gets the invoice (asking a Lightning address for one) and the mint's fee reserve. */
  readonly quoteLightning: (
    target: LightningTarget,
    amountSats: number,
  ) => Promise<Either.Either<LightningPayout, WithdrawFailure>>;
  /** Pays a priced payout; `pending` when the mint has not settled it yet. */
  readonly payLightning: (
    payout: LightningPayout,
  ) => Promise<Either.Either<"paid" | "pending", WithdrawFailure>>;
  /** Sends a token as a chat message the recipient's Linky receives. */
  readonly sendToLinky: (
    to: Pubkey,
    amountSats: number,
  ) => Promise<WithdrawFailure | null>;
  /** Settles payouts a reload interrupted. */
  readonly start: () => void;
}

const meltFailure = (error: MeltError | SendError): WithdrawFailure => {
  switch (error._tag) {
    case "InsufficientFunds":
    case "AmountConsumedByFee":
      return "insufficient-funds";
    case "MintUnreachable":
    case "CounterLockTimeout":
      return "mint-unreachable";
    default:
      return "payment-failed";
  }
};

const LINKY_REF = "withdrawal:";

export const createWithdrawals = ({
  evolu,
  nostr,
  wallet,
}: {
  readonly evolu: AppEvolu;
  readonly nostr: Nostr;
  readonly wallet: Wallet;
}): Withdrawals => {
  const withdrawalOf = async (match: (quoteId: string | null) => boolean) =>
    (await loadWithdrawals(evolu)).find(
      (withdrawal) =>
        withdrawal.status === "pending" && match(withdrawal.quoteId),
    );

  const serially = serialQueue("Linky withdrawal");
  const refOf = (id: WithdrawalId) => `${LINKY_REF}${id}`;

  nostr.onOutboxResult(LINKY_REF, async (result) => {
    const withdrawal = (await loadWithdrawals(evolu)).find(
      ({ id }) => refOf(id) === result.ref,
    );
    const operationId = withdrawal?.operationId;
    if (!withdrawal || !operationId) return;
    if (result._tag === "OutboxJobSucceeded") {
      await wallet.run(
        Effect.flatMap(Tokens, (tokens) =>
          tokens.forget(OperationId.make(operationId)),
        ),
      );
      await finishWithdrawal(evolu, withdrawal.id, { status: "done" });
      return;
    }
    await wallet.returnSend(operationId);
    await finishWithdrawal(evolu, withdrawal.id, {
      status: "failed",
      error: result.detail || result.reason,
    });
  });

  const settleMelt = async (
    id: WithdrawalId,
    outcome: Either.Either<{ readonly feePaid: number }, MeltError>,
  ): Promise<Either.Either<"paid" | "pending", WithdrawFailure>> => {
    if (Either.isRight(outcome)) {
      await finishWithdrawal(evolu, id, {
        status: "done",
        feeSats: outcome.right.feePaid,
      });
      return Either.right("paid");
    }
    if (outcome.left._tag === "PaymentPending") return Either.right("pending");
    await finishWithdrawal(evolu, id, {
      status: "failed",
      error: outcome.left._tag,
    });
    return Either.left(meltFailure(outcome.left));
  };

  /**
   * Settles Linky withdrawals a reload interrupted: one whose token never
   * reached the outbox is queued now, one cut off before its send was linked
   * fails, and a send no live withdrawal holds goes back to the balance.
   */
  const resumeLinky = () =>
    serially(async () => {
      // An employee device sends only forwards, which are not withdrawals.
      if ((await loadOwnShop(evolu)) === null) return;
      const withdrawals = await loadWithdrawals(evolu);
      const sends = await wallet.pendingSends();
      const queued = await loadOutboxRefs(evolu);
      for (const withdrawal of withdrawals) {
        if (withdrawal.kind !== "linky" || withdrawal.status !== "pending") {
          continue;
        }
        if (withdrawal.operationId === null) {
          await finishWithdrawal(evolu, withdrawal.id, {
            status: "failed",
            error: "Interrupted",
          });
          continue;
        }
        const send = sends.find(({ id }) => id === withdrawal.operationId);
        const to = decodeNpub(withdrawal.target);
        if (send && to && !queued.has(refOf(withdrawal.id))) {
          await nostr.sendToken(to, send.tokenText, refOf(withdrawal.id));
        }
      }
      const live = new Set(
        withdrawals.flatMap(({ status, operationId }) =>
          status === "failed" ? [] : [operationId],
        ),
      );
      for (const send of sends) {
        if (!live.has(send.id)) await wallet.returnSend(send.id);
      }
    });

  return {
    quoteLightning: async (target, amountSats) => {
      const source = await wallet.richestMint();
      if (source === null) return Either.left("insufficient-funds");
      let invoice: Bolt11Invoice;
      if (target.kind === "invoice") {
        invoice = target.invoice;
      } else {
        try {
          const { pr } = await fetchLnurlInvoiceForTarget(
            target.target,
            amountSats,
          );
          invoice = Bolt11Invoice.make(pr);
        } catch (error) {
          console.warn("LNURL invoice failed", error);
          return Either.left("lnurl-failed");
        }
      }
      const quote = await wallet.run(
        Effect.flatMap(Melt, (melt) =>
          melt.quote(new MeltDraft({ mint: source.mint, invoice })),
        ),
      );
      if (Either.isLeft(quote)) return Either.left(meltFailure(quote.left));
      if (quote.right.amount + quote.right.feeReserve > source.sats) {
        return Either.left("insufficient-funds");
      }
      return Either.right({
        target: target.kind === "invoice" ? target.invoice : target.target,
        invoice,
        quote: quote.right,
      });
    },
    payLightning: async ({ target, invoice, quote }) => {
      const id = await createWithdrawal(evolu, {
        kind: "lightning",
        target,
        amountSats: quote.amount,
        quoteId: quote.quoteId,
      });
      const paid = await wallet.run(
        Effect.flatMap(Melt, (melt) =>
          melt.melt(
            new MeltDraft({
              mint: quote.mint,
              invoice,
              quoteId: quote.quoteId,
            }),
          ),
        ),
      );
      return settleMelt(id, paid);
    },
    sendToLinky: (to, amountSats) =>
      serially(async (): Promise<WithdrawFailure | null> => {
        const source = await wallet.richestMint();
        if (source === null || source.sats < amountSats) {
          return "insufficient-funds";
        }
        // Stored first, so a reload at any later step leaves a row `resumeLinky` settles.
        const id = await createWithdrawal(evolu, {
          kind: "linky",
          target: encodeNpub(to),
          amountSats,
        });
        const sent = await wallet.run(
          Effect.flatMap(Send, (send) =>
            send.send(
              new SendDraft({
                mint: source.mint,
                amount: Amount.make(amountSats),
                produceAs: "pending",
              }),
            ),
          ),
        );
        if (Either.isLeft(sent)) {
          await finishWithdrawal(evolu, id, {
            status: "failed",
            error: sent.left._tag,
          });
          return meltFailure(sent.left);
        }
        const { operationId, tokenText } = sent.right;
        await attachWithdrawalSend(evolu, id, operationId);
        try {
          await nostr.sendToken(to, tokenText, refOf(id));
        } catch (error) {
          console.warn("Linky withdrawal not queued", error);
          // Still pending if the token stays out; the next start queues it.
          if (await wallet.returnSend(operationId)) {
            await finishWithdrawal(evolu, id, {
              status: "failed",
              error: "NotQueued",
            });
          }
          return "payment-failed";
        }
        return null;
      }).then((failure) =>
        failure === undefined ? "payment-failed" : failure,
      ),
    start: () => {
      void resumeLinky();
      void wallet
        .run(Effect.flatMap(Melt, (melt) => melt.resumePending))
        .then(async (results) => {
          if (Either.isLeft(results)) return;
          for (const result of results.right) {
            const withdrawal = await withdrawalOf(
              (quoteId) => quoteId === result.quoteId,
            );
            if (withdrawal === undefined) continue;
            if (result.status === "paid") {
              await finishWithdrawal(evolu, withdrawal.id, {
                status: "done",
                ...(result.receipt ? { feeSats: result.receipt.feePaid } : {}),
              });
            } else if (result.status === "unpaid") {
              await finishWithdrawal(evolu, withdrawal.id, {
                status: "failed",
                error: "PaymentFailed",
              });
            }
          }
        });
    },
  };
};
