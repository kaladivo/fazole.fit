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
import { encodeNpub } from "@linky-fit/linkstr";
import type { Pubkey } from "@linky-fit/linkstr";
import { Effect, Either } from "effect";
import {
  createWithdrawal,
  finishWithdrawal,
  loadWithdrawals,
} from "../storage";
import type { AppEvolu, WithdrawalId } from "../storage";
import type { Nostr } from "./nostr";
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

  nostr.onOutboxResult(LINKY_REF, async (result) => {
    const withdrawal = (await loadWithdrawals(evolu)).find(
      (stored) => `${LINKY_REF}${stored.id}` === result.ref,
    );
    if (!withdrawal?.operationId) return;
    const operationId = OperationId.make(withdrawal.operationId);
    if (result._tag === "OutboxJobSucceeded") {
      await wallet.run(
        Effect.flatMap(Tokens, (tokens) => tokens.forget(operationId)),
      );
      await finishWithdrawal(evolu, withdrawal.id, { status: "done" });
      return;
    }
    await wallet.run(
      Effect.flatMap(Tokens, (tokens) => tokens.returnToWallet(operationId)),
    );
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
    sendToLinky: async (to, amountSats) => {
      const source = await wallet.richestMint();
      if (source === null || source.sats < amountSats) {
        return "insufficient-funds";
      }
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
      if (Either.isLeft(sent)) return meltFailure(sent.left);
      const id = await createWithdrawal(evolu, {
        kind: "linky",
        target: encodeNpub(to),
        amountSats,
        operationId: sent.right.operationId,
      });
      await nostr.sendToken(to, sent.right.tokenText, `${LINKY_REF}${id}`);
      return null;
    },
    start: () => {
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
