import { Either } from "effect";
import {
  loadEmployeeOfDevice,
  loadPayment,
  markForwarded,
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
 * device reported.
 */
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
    if ((await loadEmployeeOfDevice(evolu, event.from)) === null) return;
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
