import {
  Amount,
  Mints,
  parseMintUrl,
  parseP2pkPubkey,
  Send,
  SendDraft,
} from "@linky-fit/linkshu";
import type { MintUrl, P2pkPubkey, TokenTransfer } from "@linky-fit/linkshu";
import type { Pubkey } from "@linky-fit/linkstr";
import { PaymentId } from "@platitprosim/core";
import { Array as Arr, Effect, Either } from "effect";
import {
  attachForward,
  loadAvailableProofs,
  loadFundedMints,
  loadPayments,
  loadPaymentsForwardedBy,
  loadStoredMembership,
  markForwarded,
  markReported,
  membershipRowQuery,
  needsForward,
  needsReport,
  paymentMintOf,
  paymentRecordOf,
  paymentsQuery,
  receiptsQuery,
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
      // Too few sats for the fee whoever redeems the token pays.
      if (sent.left._tag === "AmountConsumedByFee") return null;
      if (sent.left._tag !== "InsufficientFunds") {
        console.warn("forward not sent", sent.left);
        return "retry";
      }
    }
    return "retry";
  };

/** A send holding a token for the owner. */
interface Forward {
  readonly operationId: string;
  readonly tokenText: string;
}

const forwardOf = ({
  forwardOperationId,
  lockedToken,
}: Payment): Forward | null =>
  forwardOperationId === null || lockedToken === null
    ? null
    : { operationId: forwardOperationId, tokenText: lockedToken };

/**
 * Employee install: reports every change of a payment to the owner, and
 * sweeps Bitcoin the device received to the owner as a P2PK-locked token,
 * so the device never keeps the shop's money, also sats that paid no
 * payment. A payment counts as forwarded only once the token carrying its
 * sats reached a relay.
 */
export const createEmployeeSync = ({
  evolu,
  nostr,
  sweep,
  forgetSend,
  pendingSends,
}: {
  readonly evolu: AppEvolu;
  readonly nostr: Nostr;
  readonly sweep: Sweep;
  /** Drops the delivered send from the wallet's books. */
  readonly forgetSend: (operationId: string) => Promise<void>;
  /** The wallet's undelivered sends; on an employee device each one is a forward. */
  readonly pendingSends: () => Promise<readonly TokenTransfer[]>;
}) => {
  const serially = serialQueue("employee sync");

  /** Forwards queued in this session; the outbox delivers them from here. */
  const queued = new Set<string>();

  const queue = async (
    owner: Pubkey,
    forward: Forward,
    payments: readonly Payment[],
  ) => {
    await nostr.sendAppMessage(
      owner,
      {
        v: 1,
        type: "LockedToken",
        paymentIds: payments.map(({ id }) => PaymentId.make(id)),
        token: forward.tokenText,
      },
      `${FORWARD_REF}${forward.operationId}`,
    );
    queued.add(forward.operationId);
  };

  /** Stores the token on every payment whose sats it carries, then queues it. */
  const deliver = async (
    owner: Pubkey,
    forward: Forward,
    payments: readonly Payment[],
  ) => {
    for (const payment of payments) {
      await attachForward(evolu, payment.id, {
        token: forward.tokenText,
        operationId: forward.operationId,
      });
    }
    await queue(owner, forward, payments);
  };

  const forwardFunds = async (
    payments: readonly Payment[],
    membership: StoredMembership,
    afterRestart: boolean,
  ) => {
    const owner = parseP2pkPubkey(membership.ownerPubkey);
    if (owner === null) return;
    const waiting = payments.filter(needsForward);
    // A reload may have come between storing a token and queueing it; the owner receives a repeat once.
    if (afterRestart) {
      const stored = Arr.groupBy(
        waiting.filter((payment) => forwardOf(payment) !== null),
        (payment) => payment.forwardOperationId ?? "",
      );
      for (const carried of Object.values(stored)) {
        const forward = forwardOf(carried[0]);
        if (forward && !queued.has(forward.operationId)) {
          await queue(membership.ownerPubkey, forward, carried);
        }
      }
    }
    const mintOf = (payment: Payment) =>
      parseMintUrl(paymentMintOf(payment) ?? membership.mintUrl);
    let unswept = waiting.filter((payment) => forwardOf(payment) === null);
    const sends = await pendingSends();
    const attached = new Set(
      payments.map(({ forwardOperationId }) => forwardOperationId),
    );
    // A send a reload cut off from its payments carries the sats they had by then.
    for (const send of sends) {
      if (attached.has(send.id) || queued.has(send.id)) continue;
      const carried = unswept.filter(
        (payment) =>
          mintOf(payment) === send.mint &&
          (payment.paidAtMs ?? 0) < (send.createdAt + 1) * 1000,
      );
      unswept = unswept.filter((payment) => !carried.includes(payment));
      await deliver(
        membership.ownerPubkey,
        { operationId: send.id, tokenText: send.tokenText },
        carried,
      );
    }
    const byMint = new Map<string, readonly Payment[]>(
      Object.entries(Arr.groupBy(unswept, (payment) => mintOf(payment) ?? "")),
    );
    for (const funded of await loadFundedMints(evolu)) {
      const mint = parseMintUrl(funded) ?? funded;
      if (!byMint.has(mint)) byMint.set(mint, []);
    }
    for (const [mintUrl, carried] of byMint) {
      const mint = parseMintUrl(mintUrl);
      if (mint === null) continue;
      const swept = await sweep(mint, owner);
      if (swept === "retry") continue;
      if (swept !== null) {
        await deliver(membership.ownerPubkey, swept, carried);
        continue;
      }
      // Nothing left to sweep: the sats went with a token still on its way, which has to arrive first, or were too few to send.
      if (sends.some((send) => send.mint === mint)) continue;
      for (const payment of carried) await markForwarded(evolu, payment.id);
    }
  };

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
      await forwardFunds(payments, membership, afterRestart);
    });

  nostr.onOutboxResult(FORWARD_REF, async (result) => {
    const operationId = result.ref.slice(FORWARD_REF.length);
    if (result._tag === "OutboxJobFailed") {
      console.warn("forward not delivered", result.reason);
      queued.delete(operationId);
      return;
    }
    for (const payment of await loadPaymentsForwardedBy(evolu, operationId)) {
      if (payment.forwardedAtMs === null) {
        await markForwarded(evolu, payment.id);
      }
    }
    await forgetSend(operationId);
  });

  let started = false;

  return {
    /** One pass; `afterRestart` also queues again tokens a previous session stored. */
    sync,
    /** Reports and forwards whatever a reload interrupted, then follows every change; once. */
    start: () => {
      if (started) return;
      started = true;
      let first = true;
      watchQueries(
        evolu,
        [paymentsQuery(evolu), membershipRowQuery(evolu), receiptsQuery(evolu)],
        () => {
          void sync(first);
          first = false;
        },
      );
      globalThis.addEventListener("online", () => void sync(false));
    },
  };
};
