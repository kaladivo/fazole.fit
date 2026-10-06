import { extractTokenText, parseTokenText } from "@linky-fit/linkshu";
import {
  buildBip321PaymentUri,
  decodePaymentRequest,
  decodePaymentRequestPayload,
  encodeNostrPaymentRequest,
} from "@linky-fit/linkshu/payment-request";
import type { Sats } from "./money";
import type { PaymentStatus } from "./payment";

/**
 * The NUT-18 request a customer's Cashu wallet pays: `sats` at the shop mint,
 * single use, sent as a NIP-17 message to this device, the same format linky
 * builds. The payment id is the request id.
 */
export const buildCashuRequest = (request: {
  readonly sats: Sats;
  readonly mintUrl: string;
  readonly deviceNprofile: string;
  readonly paymentId: string;
}): string =>
  encodeNostrPaymentRequest({
    amount: request.sats,
    mintUrls: [request.mintUrl],
    recipientNprofile: request.deviceNprofile,
    requestId: request.paymentId,
  });

/** `bitcoin:?lightning=<bolt11>&creq=<creqA…>`: a wallet pays whichever leg it understands. */
export const buildBitcoinPaymentUri = (
  invoice: string,
  cashuRequest: string,
): string =>
  buildBip321PaymentUri({ lightning: invoice, creq: cashuRequest }) ??
  `bitcoin:?lightning=${invoice}`;

/** The mint a stored Cashu request is payable at. */
export const cashuRequestMint = (cashuRequest: string): string | null =>
  decodePaymentRequest(cashuRequest)?.mints[0] ?? null;

/** What an incoming Cashu token or NUT-18 payload offers, read before receiving it. */
export interface IncomingCashu {
  readonly mint: string;
  /** Face value in the token's unit, before the mint's input fee. */
  readonly amount: number;
  /** `null` when the token names none, which means sat. */
  readonly unit: string | null;
  /** The request id a NUT-18 payload echoes; a bare token carries none. */
  readonly requestId: string | null;
}

/**
 * Reads a chat message's text: Linky sends a bare `cashuB…` token, other
 * wallets the NUT-18 payload JSON. `null` when it carries no token.
 */
export const readIncomingCashu = (text: string): IncomingCashu | null => {
  const payload = decodePaymentRequestPayload(text);
  if (payload !== null) {
    const { mint, amount, unit, requestId } = payload;
    return { mint, amount, unit, requestId };
  }
  const token = extractTokenText(text);
  const parsed = token === null ? null : parseTokenText(token);
  return parsed?.mint
    ? {
        mint: parsed.mint,
        amount: parsed.amount,
        unit: parsed.unit,
        requestId: null,
      }
    : null;
};

/** A payment that still waits for its Bitcoin leg. */
export interface OpenBitcoinPayment {
  readonly id: string;
  readonly status: PaymentStatus;
  readonly sats: Sats;
  readonly mintUrl: string;
  readonly createdAtMs: number;
}

const sameMint = (a: string, b: string) =>
  a.trim().replace(/\/+$/u, "").toLowerCase() ===
  b.trim().replace(/\/+$/u, "").toLowerCase();

/**
 * The payment an incoming token pays, if any. A payload naming its request
 * matches that payment, even one the merchant cancelled. A bare token names
 * none, so it pays the pending payment at its mint it covers most closely,
 * the newest on a tie.
 */
export const matchIncomingCashu = <P extends OpenBitcoinPayment>(
  incoming: IncomingCashu,
  payments: readonly P[],
): P | null => {
  if (incoming.unit !== null && incoming.unit !== "sat") return null;
  const payable = payments.filter(
    (payment) =>
      payment.status !== "paid" &&
      sameMint(payment.mintUrl, incoming.mint) &&
      incoming.amount >= payment.sats,
  );
  if (incoming.requestId !== null) {
    return payable.find((payment) => payment.id === incoming.requestId) ?? null;
  }
  const [closest] = payable
    .filter((payment) => payment.status === "pending")
    .sort((a, b) => b.sats - a.sats || b.createdAtMs - a.createdAtMs);
  return closest ?? null;
};
