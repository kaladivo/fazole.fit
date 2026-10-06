import {
  Amount,
  Mints,
  parseMintUrl,
  parseP2pkPubkey,
  Send,
  SendDraft,
} from "@linky-fit/linkshu";
import type { MintUrl, P2pkPubkey } from "@linky-fit/linkshu";
import { PaymentId } from "@platitprosim/core";
import { Effect, Either } from "effect";
import {
  attachForward,
  loadAvailableProofs,
  loadPayments,
  loadStoredMembership,
  markForwarded,
  markReported,
  membershipRowQuery,
  needsForward,
  needsReport,
  paymentRecordOf,
  paymentsQuery,
  watchQueries,
} from "../storage";
import type { AppEvolu, Payment, StoredMembership } from "../storage";
import { sweepAmount } from "../team/team";
import type { Nostr } from "./nostr";
import { serialQueue } from "./serial";
import type { Wallet } from "./wallet";

const FORWARD_REF = "forward:";
/** Each retry assumes one more sat of fee than the mint published. */
const SWEEP_ATTEMPTS = 3;

/** A sweep's token, `null` when the mint holds nothing to send, `"retry"` when the mint has to be asked again later. */
export type SweepResult =
  | { readonly tokenText: string; readonly operationId: string }
  | null
  | "retry";

/** Locks everything the device holds at `mint` to `owner`. */
export type Sweep = (mint: MintUrl, owner: P2pkPubkey) => Promise<SweepResult>;

export const createSweep =
  (evolu: AppEvolu, wallet: Wallet): Sweep =>
  async (mint, owner) => {
    const info = await wallet.run(
      Effect.flatMap(Mints, (mints) => mints.info(mint)),
    );
    if (Either.isLeft(info)) {
      console.warn("mint info unavailable", info.left);
      return "retry";
    }
    if (!info.right.supportsP2pk) {
      console.warn("the shop mint cannot lock tokens", mint);
      return "retry";
    }
    const proofs = await loadAvailableProofs(evolu, mint);
    const amount = sweepAmount({
      balance: proofs.amount,
      proofs: proofs.count,
      inputFeePpk: info.right.inputFeePpk,
    });
    for (let extraFee = 0; extraFee < SWEEP_ATTEMPTS; extraFee += 1) {
      if (amount - extraFee <= 0) return null;
      const sent = await wallet.run(
        Effect.flatMap(Send, (send) =>
          send.send(
            new SendDraft({
              mint,
              amount: Amount.make(amount - extraFee),
              produceAs: "pending",
              lockTo: owner,
            }),
          ),
        ),
      );
      if (Either.isRight(sent)) return sent.right;
      if (sent.left._tag !== "InsufficientFunds") {
        console.warn("forward not sent", sent.left);
        return "retry";
      }
    }
    return "retry";
  };

/**
 * Employee install: reports every change of a payment to the owner, and
 * sweeps Bitcoin the device received to the owner as a P2PK-locked token,
 * so the device never keeps the shop's money.
 */
export const createEmployeeSync = ({
  evolu,
  nostr,
  sweep,
  forgetSend,
}: {
  readonly evolu: AppEvolu;
  readonly nostr: Nostr;
  readonly sweep: Sweep;
  /** Drops the delivered send from the wallet's books. */
  readonly forgetSend: (operationId: string) => Promise<void>;
}) => {
  const serially = serialQueue("employee sync");

  const queueToken = (
    payment: Payment,
    membership: StoredMembership,
    token: string,
  ) =>
    nostr.sendAppMessage(
      membership.ownerPubkey,
      {
        v: 1,
        type: "LockedToken",
        paymentId: PaymentId.make(payment.id),
        token,
      },
      `${FORWARD_REF}${payment.id}`,
    );

  /** `false` when the sweep has to wait for the mint. */
  const forward = async (
    payment: Payment,
    membership: StoredMembership,
  ): Promise<boolean> => {
    if (payment.lockedToken !== null) {
      await queueToken(payment, membership, payment.lockedToken);
      return true;
    }
    const mint = parseMintUrl(membership.mintUrl);
    const owner = parseP2pkPubkey(membership.ownerPubkey);
    if (mint === null || owner === null) return false;
    const swept = await sweep(mint, owner);
    if (swept === "retry") return false;
    if (swept === null) {
      // An earlier sweep already took this payment's sats.
      await markForwarded(evolu, payment.id);
      return true;
    }
    await attachForward(evolu, payment.id, {
      token: swept.tokenText,
      operationId: swept.operationId,
    });
    await queueToken(payment, membership, swept.tokenText);
    return true;
  };

  /** Payments whose token was queued in this session; the outbox delivers it from here. */
  const queued = new Set<string>();

  const sync = (afterRestart: boolean) =>
    serially(async () => {
      const membership = await loadStoredMembership(evolu);
      if (membership === null) return;
      const payments = (await loadPayments(evolu)).reverse();
      // A removed employee's records are ignored, but their funds still go to the owner.
      for (const payment of membership.removed ? [] : payments) {
        if (needsReport(payment)) {
          await nostr.sendAppMessage(
            membership.ownerPubkey,
            paymentRecordOf(payment),
            `record:${payment.id}:${payment.updatedAtMs}`,
          );
          await markReported(evolu, payment.id, payment.updatedAtMs);
        }
      }
      for (const payment of payments) {
        if (!needsForward(payment) || queued.has(payment.id)) continue;
        // A token queued before a restart is still in the durable outbox.
        if (payment.lockedToken !== null && !afterRestart) continue;
        if (await forward(payment, membership)) queued.add(payment.id);
      }
    });

  nostr.onOutboxResult(FORWARD_REF, async (result) => {
    const id = result.ref.slice(FORWARD_REF.length);
    const payment = (await loadPayments(evolu)).find(
      (stored) => stored.id === id,
    );
    if (payment === undefined || payment.forwardedAtMs !== null) return;
    if (result._tag === "OutboxJobFailed") {
      console.warn("forward not delivered", result.reason);
      queued.delete(id);
      return;
    }
    await markForwarded(evolu, payment.id);
    if (payment.forwardOperationId !== null) {
      await forgetSend(payment.forwardOperationId);
    }
  });

  let started = false;

  return {
    /** One pass; `afterRestart` also queues again tokens a previous session queued. */
    sync,
    /** Reports and forwards whatever a reload interrupted, then follows every change; once. */
    start: () => {
      if (started) return;
      started = true;
      let first = true;
      watchQueries(
        evolu,
        [paymentsQuery(evolu), membershipRowQuery(evolu)],
        () => {
          void sync(first);
          first = false;
        },
      );
      globalThis.addEventListener("online", () => void sync(false));
    },
  };
};
