import { readIncomingCashu } from "@platitprosim/core";
import { Either } from "effect";
import {
  hasReceipt,
  loadEmployeeOfDevice,
  loadPayment,
  markForwarded,
  recordReceipt,
  reportedPaymentIdFor,
} from "../storage";
import type { AppEvolu } from "../storage";
import type { Nostr } from "./nostr";
import type { Wallet } from "./wallet";
import { isTransientReceiveError } from "./wallet";

/**
 * Receives `LockedToken` app messages: tokens P2PK-locked to this device's
 * key, such as an employee device forwarding payments to the owner. Any
 * token locked to the device is received; the payments it names are marked
 * forwarded once the funds are in the wallet, also when the wallet already
 * holds them from an earlier delivery, but only those an active employee's
 * device reported. What reached the wallet is recorded as a forward receipt.
 */
/** A receive a reload cut off before it was recorded; its net amount is gone, so the face value stands in. */
const replayedReceive = async (
  evolu: AppEvolu,
  wallet: Wallet,
  operationId: string | null,
  token: string,
) => {
  const sats = readIncomingCashu(token)?.amount;
  return operationId !== null &&
    sats !== undefined &&
    !(await hasReceipt(evolu, operationId)) &&
    (await wallet.isReceived(operationId))
    ? { operationId, sats }
    : null;
};

export const receiveLockedTokens = (
  evolu: AppEvolu,
  nostr: Nostr,
  wallet: Wallet,
) =>
  nostr.onAppMessage(async (message, event) => {
    if (message.type !== "LockedToken") return;
    const received = await wallet.receive(message.token, { unlock: true });
    if (Either.isLeft(received)) {
      // Unacknowledged, so the next session receives it again.
      if (isTransientReceiveError(received.left)) throw received.left;
      if (received.left._tag !== "TokenAlreadyKnown") {
        console.warn("locked token not received", received.left);
        return;
      }
    }
    const employee = await loadEmployeeOfDevice(evolu, event.from);
    const receive = Either.isRight(received)
      ? { operationId: received.right.operationId, sats: received.right.amount }
      : received.left._tag === "TokenAlreadyKnown"
        ? await replayedReceive(
            evolu,
            wallet,
            received.left.operationId,
            message.token,
          )
        : null;
    if (receive !== null) {
      await recordReceipt(evolu, {
        ...receive,
        kind: "forward",
        ...(employee ? { employeeId: employee.id } : {}),
      });
    }
    if (employee === null) return;
    for (const paymentId of message.paymentIds) {
      const payment = await loadPayment(
        evolu,
        reportedPaymentIdFor(event.from, paymentId),
      );
      if (payment !== null && payment.forwardedAtMs === null) {
        await markForwarded(evolu, payment.id);
      }
    }
  });
