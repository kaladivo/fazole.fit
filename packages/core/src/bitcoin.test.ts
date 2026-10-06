import {
  decodePaymentRequest,
  parseBip321Uri,
} from "@linky-fit/linkshu/payment-request";
import { DecodedToken, encodeToken } from "@linky-fit/linkshu";
import { encodeNprofile, parsePubkey } from "@linky-fit/linkstr";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  buildBitcoinPaymentUri,
  buildCashuRequest,
  cashuRequestMint,
  matchIncomingCashu,
  readIncomingCashu,
} from "./bitcoin";
import type { IncomingCashu, OpenBitcoinPayment } from "./bitcoin";
import { Sats } from "./money";

const mint = "http://localhost:3348";
const device = parsePubkey("a".repeat(64));
if (device === null) throw new Error("bad test pubkey");
const nprofile = encodeNprofile(device, ["ws://localhost:7787"]);
const invoice = "lnbc100n1fakeinvoice";

const payment = (
  id: string,
  sats: number,
  overrides: Partial<OpenBitcoinPayment> = {},
): OpenBitcoinPayment => ({
  id,
  status: "pending",
  sats: Sats.make(sats),
  mintUrl: mint,
  createdAtMs: 1_000,
  ...overrides,
});

const token = (amount: number, overrides: Partial<IncomingCashu> = {}) => ({
  mint,
  amount,
  unit: "sat",
  requestId: null,
  ...overrides,
});

describe("buildCashuRequest", () => {
  it("asks for the sats at the shop mint over Nostr, under the payment id", () => {
    const request = buildCashuRequest({
      sats: Sats.make(2_100),
      mintUrl: mint,
      deviceNprofile: nprofile,
      paymentId: "payment-1",
    });
    expect(decodePaymentRequest(request)).toMatchObject({
      amount: 2_100,
      unit: "sat",
      singleUse: true,
      mints: [mint],
      id: "payment-1",
      transports: [{ type: "nostr", target: nprofile, tags: [["n", "17"]] }],
    });
    expect(cashuRequestMint(request)).toBe(mint);
  });

  it("puts both legs into one BIP-321 URI", () => {
    const creq = buildCashuRequest({
      sats: Sats.make(21),
      mintUrl: mint,
      deviceNprofile: nprofile,
      paymentId: "payment-1",
    });
    const uri = buildBitcoinPaymentUri(invoice, creq);
    expect(uri.startsWith("bitcoin:?")).toBe(true);
    expect(parseBip321Uri(uri)).toMatchObject({ lightning: invoice, creq });
  });

  it("reads no mint from text that is not a request", () => {
    expect(cashuRequestMint("cashuBnope")).toBeNull();
  });
});

describe("matchIncomingCashu", () => {
  it("matches a payload by its request id, even after a cancel", () => {
    const cancelled = payment("p1", 100, { status: "cancelled" });
    expect(
      matchIncomingCashu(token(100, { requestId: "p1" }), [
        cancelled,
        payment("p2", 100, { createdAtMs: 2_000 }),
      ]),
    ).toBe(cancelled);
  });

  it("refuses a payload whose request is paid, at another mint or short", () => {
    const payments = [
      payment("paid", 100, { status: "paid" }),
      payment("other-mint", 100, { mintUrl: "https://cashu.cz" }),
      payment("short", 100),
    ];
    for (const requestId of ["paid", "other-mint", "missing"]) {
      expect(
        matchIncomingCashu(token(100, { requestId }), payments),
      ).toBeNull();
    }
    expect(
      matchIncomingCashu(token(99, { requestId: "short" }), payments),
    ).toBeNull();
  });

  it("matches a bare token to the pending payment it covers most closely", () => {
    const payments = [
      payment("small", 50),
      payment("exact-old", 100, { createdAtMs: 1_000 }),
      payment("exact-new", 100, { createdAtMs: 2_000 }),
      payment("large", 200),
      payment("cancelled", 100, { status: "cancelled", createdAtMs: 3_000 }),
    ];
    expect(matchIncomingCashu(token(100), payments)?.id).toBe("exact-new");
    expect(matchIncomingCashu(token(120), payments)?.id).toBe("exact-new");
    expect(matchIncomingCashu(token(60), payments)?.id).toBe("small");
    expect(matchIncomingCashu(token(40), payments)).toBeNull();
  });

  it("compares mints without a trailing slash or case", () => {
    expect(
      matchIncomingCashu(token(100, { mint: "HTTP://localhost:3348/" }), [
        payment("p1", 100),
      ])?.id,
    ).toBe("p1");
  });

  it("ignores tokens in another unit and treats a missing unit as sat", () => {
    const payments = [payment("p1", 100)];
    expect(
      matchIncomingCashu(token(100, { unit: "usd" }), payments),
    ).toBeNull();
    expect(matchIncomingCashu(token(100, { unit: null }), payments)?.id).toBe(
      "p1",
    );
  });
});

describe("readIncomingCashu", () => {
  const proofs = [
    {
      id: "00ad268c4d1f5826",
      amount: 64,
      secret: "s1",
      C: "02".padEnd(66, "a"),
    },
    {
      id: "00ad268c4d1f5826",
      amount: 36,
      secret: "s2",
      C: "02".padEnd(66, "b"),
    },
  ];

  it("reads a bare token's mint and face value", () => {
    const text = encodeToken(
      Schema.decodeUnknownSync(DecodedToken)({
        mint,
        unit: "sat",
        memo: null,
        proofs,
      }),
    );
    expect(readIncomingCashu(text)).toEqual({
      mint,
      amount: 100,
      unit: "sat",
      requestId: null,
    });
    expect(readIncomingCashu(`cashu:${text}`)?.amount).toBe(100);
  });

  it("reads the request id a NUT-18 payload echoes", () => {
    const payload = JSON.stringify({ id: "p1", mint, unit: "sat", proofs });
    expect(readIncomingCashu(payload)).toEqual({
      mint,
      amount: 100,
      unit: "sat",
      requestId: "p1",
    });
  });

  it("returns null for plain chat text", () => {
    expect(readIncomingCashu("thanks for the coffee")).toBeNull();
  });
});
