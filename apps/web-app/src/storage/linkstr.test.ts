import { OutboxJobId, StoredOutboxJob, UnixSeconds } from "@linky-fit/linkstr";
import { makeIdentity } from "@linky-fit/linkstr/testing";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  INBOX_CURSOR_MIN_ADVANCE_SEC,
  makeEvoluInboxCursorStore,
  makeEvoluOutboxStore,
} from "./linkstr";
import { createTestEvolu } from "./testing/testEvolu";

const run = Effect.runPromise;
const alice = makeIdentity();
const bob = makeIdentity();

const job = (jobId: string, state: "queued" | "awaiting-ack" = "queued") =>
  Schema.decodeUnknownSync(StoredOutboxJob)({
    jobId,
    ref: `payment:${jobId}`,
    operation: {
      _tag: "chat.text",
      draft: {
        to: bob.pubkey,
        content: `hello ${jobId}`,
        sentAt: 1_700_000_000,
      },
    },
    pubkey: alice.pubkey,
    enqueuedAt: 1_700_000_000,
    state:
      state === "queued"
        ? { _tag: "queued" }
        : {
            _tag: "awaiting-ack",
            result: {
              _tag: "OutboxJobFailed",
              jobId,
              ref: `payment:${jobId}`,
              reason: "unexpected-error",
              detail: "boom",
            },
          },
  });

describe("OutboxStore", () => {
  it("keeps jobs in insertion order across updates and removals", async () => {
    const evolu = createTestEvolu();
    const outbox = makeEvoluOutboxStore(evolu);
    for (const id of ["c", "a", "b"]) await run(outbox.insert(job(id)));
    await run(outbox.update(job("a", "awaiting-ack")));
    await run(outbox.remove(OutboxJobId.make("c")));
    await run(outbox.remove(OutboxJobId.make("missing")));
    await run(outbox.insert(job("d")));

    const loaded = await run(makeEvoluOutboxStore(evolu).loadAll);
    expect(loaded.map((stored) => stored.jobId)).toEqual(["a", "b", "d"]);
    expect(loaded[0]).toEqual(job("a", "awaiting-ack"));
    expect(loaded[1]).toEqual(job("b"));
  });
});

describe("InboxCursorStore", () => {
  it("starts empty and keeps each identity's cursor apart", async () => {
    const evolu = createTestEvolu();
    const aliceCursor = makeEvoluInboxCursorStore(evolu, alice.pubkey);
    expect(await run(aliceCursor.load)).toBeNull();
    await run(aliceCursor.save(UnixSeconds.make(1_700_000_000)));
    expect(await run(makeEvoluInboxCursorStore(evolu, alice.pubkey).load)).toBe(
      1_700_000_000,
    );
    expect(
      await run(makeEvoluInboxCursorStore(evolu, bob.pubkey).load),
    ).toBeNull();
  });

  it("syncs a cursor only once it moved well past the stored one", async () => {
    const evolu = createTestEvolu();
    const cursor = makeEvoluInboxCursorStore(evolu, alice.pubkey);
    const start = 1_700_000_000;
    await run(cursor.save(UnixSeconds.make(start)));
    await run(cursor.save(UnixSeconds.make(start + 60)));
    expect(await run(cursor.load)).toBe(start + 60);
    const reopened = () => makeEvoluInboxCursorStore(evolu, alice.pubkey).load;
    expect(await run(reopened())).toBe(start);
    const later = start + INBOX_CURSOR_MIN_ADVANCE_SEC;
    await run(cursor.save(UnixSeconds.make(later)));
    expect(await run(reopened())).toBe(later);
  });
});
