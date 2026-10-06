/**
 * Money for the local dev mint, whose FakeWallet settles nothing by itself.
 *
 *   bun run mint:pay <bolt11>   marks an invoice of the local mint paid
 *   bun run mint:token <sats>   prints a fresh Cashu token from the local mint
 */
import {
  Amount,
  Bip39Seed,
  MintUrl,
  runLinkshu,
  Send,
  SendDraft,
  Topup,
  TopupDraft,
} from "@linky-fit/linkshu";
import { Effect } from "effect";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const mint = MintUrl.make(process.env.MINT_URL ?? "http://localhost:3348");
const composeFile = fileURLToPath(
  new URL("../../../docker-compose.dev.yml", import.meta.url),
);

// Flips the quote the way nutshell's own management RPC does: state only.
const MARK_PAID = `
import sqlite3, sys, time
db = sqlite3.connect("/app/data/mint/mint.sqlite3")
now = int(time.time())
changed = db.execute(
    "update mint_quotes set state = 'PAID', paid_time = ?, updated_at = ?"
    " where lower(request) = lower(?) and state = 'UNPAID'",
    (now, now, sys.argv[1].strip()),
).rowcount
db.commit()
sys.exit(0 if changed else 1)
`;

const markPaid = (invoice: string) => {
  const result = spawnSync(
    "docker",
    [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "cashu-mint",
      "python3",
      "-c",
      MARK_PAID,
      invoice.replace(/^lightning:/iu, ""),
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  if (result.status !== 0) {
    throw new Error("No unpaid invoice of the local mint matches it.");
  }
};

// Covers the mint's input fee on the swap that cuts the token out.
const SWAP_FEE_ROOM = 10;

const mintToken = (sats: number) =>
  runLinkshu(
    { bip39Seed: Bip39Seed.make(crypto.getRandomValues(new Uint8Array(64))) },
    Effect.scoped(
      Effect.gen(function* () {
        const handle = yield* (yield* Topup).start(
          new TopupDraft({ mint, amount: Amount.make(sats + SWAP_FEE_ROOM) }),
        );
        markPaid(handle.quote.invoice);
        yield* handle.result;
        const sent = yield* (yield* Send).send(
          new SendDraft({
            mint,
            amount: Amount.make(sats),
            produceAs: "issued",
          }),
        );
        return sent.tokenText;
      }),
    ),
  );

const [command, argument] = process.argv.slice(2);
if (command === "pay" && argument) {
  markPaid(argument);
  console.log("Paid.");
} else if (command === "token" && Number(argument) > 0) {
  console.log(await mintToken(Number(argument)));
} else {
  console.error("Usage: localMint.ts pay <bolt11> | token <sats>");
  process.exit(1);
}
