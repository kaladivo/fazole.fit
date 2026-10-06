import { Either } from "effect";
import type { Nostr } from "./nostr";
import type { Wallet } from "./wallet";
import { isTransientReceiveError } from "./wallet";

/**
 * Receives `LockedToken` app messages: tokens P2PK-locked to this device's
 * key, such as an employee device forwarding a payment to the owner.
 */
export const receiveLockedTokens = (nostr: Nostr, wallet: Wallet) =>
  nostr.onAppMessage(async (message) => {
    if (message.type !== "LockedToken") return;
    const received = await wallet.receive(message.token, { unlock: true });
    // Unacknowledged, so the next session receives it again.
    if (Either.isLeft(received) && isTransientReceiveError(received.left)) {
      throw received.left;
    }
  });
