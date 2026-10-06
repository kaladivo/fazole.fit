import {
  LeaseId,
  NewOperation,
  NewProof,
  OperationId,
  ProofId,
} from "@linky-fit/linkshu";
import { Effect, Schema, TestClock, TestContext } from "effect";
import { describe, expect, it } from "vitest";
import {
  makeEvoluKeyValueStore,
  makeEvoluOperationStore,
  makeEvoluProofStore,
  memoryLeases,
} from "./linkshu";
import { cashuProofIdFor } from "./schema";
import { createTestEvolu } from "./testing/testEvolu";

const run = Effect.runPromise;

const proof = (secret: string, state: NewProof["state"] = "available") =>
  Schema.decodeUnknownSync(NewProof)({
    mint: "https://mint.example",
    unit: "sat",
    keysetId: "00ab",
    amount: 8,
    secret,
    C: "02ab",
    dleq: null,
    state,
    operationId: null,
  });

const operation = (tokenText: string, error: string | null = null) =>
  Schema.decodeUnknownSync(NewOperation)({
    kind: "send",
    status: "issued",
    mint: "https://mint.example",
    unit: "sat",
    keysetId: null,
    amount: 8,
    feeReserve: null,
    inputsTotal: null,
    quoteId: null,
    invoice: null,
    sourceMint: null,
    counter: null,
    locked: true,
    expiresAt: null,
    createdAt: 1_700_000_000,
    tokenText,
    error,
  });

describe("ProofStore", () => {
  it("derives the id from the secret, as linky does, and upserts onto the same row", async () => {
    const proofs = makeEvoluProofStore(createTestEvolu());
    const [first] = await run(proofs.insert([proof("s1")]));
    const [again] = await run(proofs.insert([proof("s1", "spent")]));
    expect(first?.id).toBe(cashuProofIdFor("s1"));
    expect(again?.id).toBe(first?.id);
    expect(again?.createdAt).toBe(first?.createdAt);
    const all = await run(proofs.loadAll);
    expect(all.map((p) => [p.secret, p.state])).toEqual([["s1", "spent"]]);
  });

  it("applies patches and ignores unknown ids", async () => {
    const evolu = createTestEvolu();
    const proofs = makeEvoluProofStore(evolu);
    const [stored] = await run(proofs.insert([proof("s1"), proof("s2")]));
    if (stored === undefined) throw new Error("no proof stored");
    const { id: operationId } = await run(
      makeEvoluOperationStore(evolu).insert(operation("cashuA1")),
    );
    await run(proofs.update(stored.id, { state: "held", operationId }));
    await run(
      proofs.update(ProofId.make(cashuProofIdFor("missing")), {
        state: "spent",
      }),
    );
    expect(
      (await run(proofs.loadAll)).map((p) => [
        p.secret,
        p.state,
        p.operationId,
      ]),
    ).toEqual([
      ["s1", "held", operationId],
      ["s2", "available", null],
    ]);
  });

  it("survives a reopen over the same database", async () => {
    const evolu = createTestEvolu();
    await run(makeEvoluProofStore(evolu).insert([proof("s1")]));
    const reopened = makeEvoluProofStore(evolu);
    expect((await run(reopened.loadAll)).map((p) => p.secret)).toEqual(["s1"]);
  });
});

describe("OperationStore", () => {
  it("upserts by operation key and reads every field back", async () => {
    const operations = makeEvoluOperationStore(createTestEvolu());
    const first = await run(operations.insert(operation("cashuA1")));
    const again = await run(operations.insert(operation("cashuA1")));
    await run(operations.insert(operation("cashuA2")));
    expect(again.id).toBe(first.id);
    const all = await run(operations.loadAll);
    expect(all).toHaveLength(2);
    expect(all.find((op) => op.id === first.id)).toEqual(first);
  });

  it("applies patches, caps long errors and ignores unknown ids", async () => {
    const operations = makeEvoluOperationStore(createTestEvolu());
    const stored = await run(operations.insert(operation("cashuA1")));
    await run(
      operations.update(stored.id, {
        status: "done",
        counter: 4,
        error: "x".repeat(1200),
      }),
    );
    await run(
      operations.update(OperationId.make("missing"), { status: "failed" }),
    );
    const [loaded] = await run(operations.loadAll);
    expect(loaded).toMatchObject({ status: "done", counter: 4, locked: true });
    expect(loaded?.error).toHaveLength(1000);
  });
});

describe("KeyValueStore", () => {
  it("stores, lists by prefix and removes values", async () => {
    const kv = makeEvoluKeyValueStore(createTestEvolu(), memoryLeases());
    await run(kv.set("linkshu.counter.a", "1"));
    await run(kv.set("linkshu.counter.b", ""));
    await run(kv.set("linkshu.mint", "https://mint.example"));
    await run(kv.set("linkshu.counter.a", "2"));
    expect(await run(kv.get("linkshu.counter.a"))).toBe("2");
    expect(await run(kv.get("linkshu.counter.b"))).toBe("");
    expect([...(await run(kv.listKeys("linkshu.counter.")))].sort()).toEqual([
      "linkshu.counter.a",
      "linkshu.counter.b",
    ]);
    await run(kv.remove("linkshu.counter.a"));
    await run(kv.remove("linkshu.never-set"));
    expect(await run(kv.get("linkshu.counter.a"))).toBeNull();
    expect(await run(kv.listKeys("linkshu.counter."))).toEqual([
      "linkshu.counter.b",
    ]);
    await run(kv.set("linkshu.counter.a", "3"));
    expect(await run(kv.get("linkshu.counter.a"))).toBe("3");
  });

  it("grants one lease per key until it is released or expires", async () => {
    const kv = makeEvoluKeyValueStore(createTestEvolu(), memoryLeases());
    const program = Effect.gen(function* () {
      const [first, second] = yield* Effect.all(
        [kv.tryAcquireLease("k", 1000), kv.tryAcquireLease("k", 1000)],
        { concurrency: "unbounded" },
      );
      expect([first, second].filter((lease) => lease !== null)).toHaveLength(1);
      if (first === null) throw new Error("the first claim lost");
      yield* kv.releaseLease("k", LeaseId.make("foreign"));
      yield* kv.renewLease("k", LeaseId.make("foreign"), 60_000);
      expect(yield* kv.tryAcquireLease("k", 1000)).toBeNull();

      yield* TestClock.adjust(800);
      yield* kv.renewLease("k", first, 1000);
      yield* TestClock.adjust(800);
      expect(yield* kv.tryAcquireLease("k", 1000)).toBeNull();
      yield* TestClock.adjust(300);
      const next = yield* kv.tryAcquireLease("k", 1000);
      expect(next).not.toBeNull();
      if (next === null) return;
      yield* kv.releaseLease("k", next);
      expect(yield* kv.tryAcquireLease("k", 1000)).not.toBeNull();
    });
    await run(program.pipe(Effect.provide(TestContext.TestContext)));
  });
});
