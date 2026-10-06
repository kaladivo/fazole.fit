import { Either } from "effect";
import { markForwarded, reportedPaymentIdFor } from "../storage";
import type { AppEvolu } from "../storage";
import type { Nostr } from "./nostr";
import type { Wallet } from "./wallet";
import { isTransientReceiveError } from "./wallet";

/**
 * Receives `LockedToken` app messages: tokens P2PK-locked to this device's
 * key, such as an employee device forwarding a payment to the owner. The
 * employee's payment is marked forwarded once the funds are in the wallet,
 * also when the wallet already holds them from an earlier delivery.
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
    await markForwarded(
      evolu,
      reportedPaymentIdFor(event.from, message.paymentId),
    );
  });
