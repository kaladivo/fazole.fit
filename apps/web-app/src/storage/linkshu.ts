import { sqliteFalse, sqliteTrue } from "@evolu/common";
import {
  KeyValueStore,
  LeaseId,
  OperationId,
  operationKeyOf,
  OperationStore,
  ProofStore,
  StoredOperation,
  StoredProof,
  UnixSeconds,
} from "@linky-fit/linkshu";
import type {
  KeyValueStoreService,
  NewOperation,
  NewProof,
  OperationStoreService,
  ProofStoreService,
} from "@linky-fit/linkshu";
import { Clock, Effect, Layer, Option, Schema } from "effect";
import type { AppEvolu } from "./evolu";
import { mutation } from "./evolu";
import {
  cashuKeyValueIdFor,
  cashuOperationIdFor,
  cashuProofIdFor,
} from "./schema";

/*
 * linkshu's storage ports on Evolu tables. Every write resolves once Evolu
 * applied it, so `loadAll` right after an `insert` or `update` sees it, the
 * read-after-write the ports require.
 */

const write = (run: Parameters<typeof mutation>[0]) =>
  Effect.promise(() => mutation(run));

const unixSeconds = (iso: string) =>
  UnixSeconds.make(Math.max(1, Math.floor(Date.parse(iso) / 1000)));

const proofRows = (evolu: AppEvolu) =>
  Effect.promise(() =>
    evolu.loadQuery(
      evolu.createQuery((db) =>
        db
          .selectFrom("cashuProof")
          .selectAll()
          .where("isDeleted", "is not", sqliteTrue),
      ),
    ),
  );

const operationRows = (evolu: AppEvolu) =>
  Effect.promise(() =>
    evolu.loadQuery(
      evolu.createQuery((db) =>
        db
          .selectFrom("cashuOperation")
          .selectAll()
          .where("isDeleted", "is not", sqliteTrue),
      ),
    ),
  );

type ProofRow = Effect.Effect.Success<ReturnType<typeof proofRows>>[number];
type OperationRow = Effect.Effect.Success<
  ReturnType<typeof operationRows>
>[number];

const decodeStoredProof = Schema.decodeUnknownOption(StoredProof);
const decodeStoredOperation = Schema.decodeUnknownOption(StoredOperation);

/** A row in the port's shape; rows that do not validate are skipped, never repaired. */
const toStoredProof = (row: ProofRow): Option.Option<StoredProof> =>
  decodeStoredProof({
    id: row.id,
    mint: row.mint,
    unit: row.unit,
    keysetId: row.keysetId,
    amount: row.amount,
    secret: row.secret,
    C: row.c,
    dleq: row.dleq,
    state: row.state,
    operationId: row.operationId,
    createdAt: unixSeconds(row.createdAt),
  });

const toStoredOperation = (row: OperationRow): Option.Option<StoredOperation> =>
  decodeStoredOperation({
    id: row.id,
    kind: row.kind,
    status: row.status,
    mint: row.mint,
    unit: row.unit,
    keysetId: row.keysetId,
    amount: row.amount,
    feeReserve: row.feeReserve,
    inputsTotal: row.inputsTotal,
    quoteId: row.quoteId,
    invoice: row.invoice,
    sourceMint: row.sourceMint,
    counter: row.counter,
    locked: row.locked === null ? null : row.locked === sqliteTrue,
    expiresAt: row.expiresAtSec,
    createdAt: row.createdAtSec,
    tokenText: row.tokenText,
    error: row.error,
  });

const proofColumns = (proof: NewProof) => ({
  mint: proof.mint,
  unit: proof.unit,
  keysetId: proof.keysetId,
  amount: proof.amount,
  secret: proof.secret,
  c: proof.C,
  dleq: proof.dleq,
  state: proof.state,
  operationId: proof.operationId,
});

// The column caps at 1000 characters; a longer serialized error is cut.
const errorColumn = (error: string | null) =>
  error?.trim().slice(0, 1000) || null;

const operationColumns = (operation: NewOperation) => ({
  kind: operation.kind,
  status: operation.status,
  mint: operation.mint,
  unit: operation.unit,
  keysetId: operation.keysetId,
  amount: operation.amount,
  feeReserve: operation.feeReserve,
  inputsTotal: operation.inputsTotal,
  quoteId: operation.quoteId,
  invoice: operation.invoice,
  sourceMint: operation.sourceMint,
  counter: operation.counter,
  locked:
    operation.locked === null
      ? null
      : operation.locked
        ? sqliteTrue
        : sqliteFalse,
  expiresAtSec: operation.expiresAt,
  createdAtSec: operation.createdAt,
  tokenText: operation.tokenText,
  error: errorColumn(operation.error),
});

const hasRow = (rows: ReadonlyArray<{ readonly id: string }>, id: string) =>
  rows.some((row) => row.id === id);

/** The ports say "unknown id: no-op"; Evolu would create a partial row instead. */
const findRow = <Row extends { readonly id: string }>(
  rows: ReadonlyArray<Row>,
  id: string,
) => rows.find((row) => row.id === id);

export const makeEvoluProofStore = (evolu: AppEvolu): ProofStoreService => {
  const loadAll = Effect.map(proofRows(evolu), (rows) =>
    rows.flatMap((row) => Option.toArray(toStoredProof(row))),
  );
  return {
    insert: (proofs) =>
      Effect.gen(function* () {
        const existing = yield* proofRows(evolu);
        for (const proof of proofs) {
          const id = cashuProofIdFor(proof.secret);
          const row = { id, ...proofColumns(proof) };
          // An update keeps the row's createdAt; an upsert would restamp it.
          yield* write((onComplete) =>
            hasRow(existing, id)
              ? evolu.update("cashuProof", row, { onComplete })
              : evolu.upsert("cashuProof", row, { onComplete }),
          );
        }
        const ids = new Set<string>(
          proofs.map((proof) => cashuProofIdFor(proof.secret)),
        );
        return (yield* loadAll).filter((proof) => ids.has(proof.id));
      }),
    update: (id, patch) =>
      Effect.gen(function* () {
        const row = findRow(yield* proofRows(evolu), id);
        if (row === undefined) return;
        yield* write((onComplete) =>
          evolu.update(
            "cashuProof",
            {
              id: row.id,
              ...(patch.state === undefined ? {} : { state: patch.state }),
              ...(patch.operationId === undefined
                ? {}
                : { operationId: patch.operationId }),
            },
            { onComplete },
          ),
        );
      }),
    loadAll,
  };
};

export const makeEvoluOperationStore = (
  evolu: AppEvolu,
): OperationStoreService => ({
  insert: (operation) =>
    Effect.gen(function* () {
      const id = cashuOperationIdFor(operationKeyOf(operation));
      const row = { id, ...operationColumns(operation) };
      const existing = yield* operationRows(evolu);
      yield* write((onComplete) =>
        hasRow(existing, id)
          ? evolu.update("cashuOperation", row, { onComplete })
          : evolu.upsert("cashuOperation", row, { onComplete }),
      );
      return new StoredOperation({ ...operation, id: OperationId.make(id) });
    }),
  update: (id, patch) =>
    Effect.gen(function* () {
      const row = findRow(yield* operationRows(evolu), id);
      if (row === undefined) return;
      yield* write((onComplete) =>
        evolu.update(
          "cashuOperation",
          {
            id: row.id,
            ...(patch.status === undefined ? {} : { status: patch.status }),
            ...(patch.keysetId === undefined
              ? {}
              : { keysetId: patch.keysetId }),
            ...(patch.counter === undefined ? {} : { counter: patch.counter }),
            ...(patch.error === undefined
              ? {}
              : { error: errorColumn(patch.error) }),
          },
          { onComplete },
        ),
      );
    }),
  loadAll: Effect.map(operationRows(evolu), (rows) =>
    rows.flatMap((row) => Option.toArray(toStoredOperation(row))),
  ),
});

type Leases = Pick<
  KeyValueStoreService,
  "tryAcquireLease" | "renewLease" | "releaseLease"
>;

/** The part of the Web Locks API (`navigator.locks`) a lease needs. */
export interface LeaseLocks {
  readonly request: (
    name: string,
    options: { readonly ifAvailable: true },
    callback: (lock: Lock | null) => Promise<void> | undefined,
  ) => Promise<void>;
}

const LEASE_LOCK_PREFIX = "platitprosim.linkshu.lease.";

/**
 * A lease is a Web Lock held until `releaseLease` or the tab closing, so two
 * tabs of the origin never both hold one; it ignores the TTL.
 */
const webLockLeases = (locks: LeaseLocks): Leases => {
  const held = new Map<
    LeaseId,
    { key: string; release: () => void; released: Promise<void> }
  >();
  return {
    tryAcquireLease: (key) =>
      Effect.async<LeaseId | null>((resume) => {
        const lease = LeaseId.make(crypto.randomUUID());
        const request = locks.request(
          LEASE_LOCK_PREFIX + key,
          { ifAvailable: true },
          (lock) => {
            if (lock === null) {
              resume(Effect.succeed(null));
              return undefined;
            }
            // The lock is held until this promise settles.
            return new Promise<void>((release) => {
              held.set(lease, { key, release, released: request });
              resume(Effect.succeed(lease));
            });
          },
        );
        const forget = () => held.delete(lease);
        request.then(forget, () => {
          forget();
          resume(Effect.succeed(null));
        });
      }),
    renewLease: () => Effect.void,
    releaseLease: (key, lease) =>
      Effect.suspend(() => {
        const entry = held.get(lease);
        if (entry?.key !== key) return Effect.void;
        entry.release();
        return Effect.promise(() => entry.released);
      }),
  };
};

/** Leases within this JavaScript context, for runtimes without Web Locks. */
export const memoryLeases = (): Leases => {
  const held = new Map<string, { lease: LeaseId; expiresAt: number }>();
  return {
    tryAcquireLease: (key, ttlMs) =>
      Effect.map(Clock.currentTimeMillis, (now) => {
        const current = held.get(key);
        if (current !== undefined && current.expiresAt > now) return null;
        const lease = LeaseId.make(crypto.randomUUID());
        held.set(key, { lease, expiresAt: now + ttlMs });
        return lease;
      }),
    renewLease: (key, lease, ttlMs) =>
      Effect.map(Clock.currentTimeMillis, (now) => {
        if (held.get(key)?.lease === lease) {
          held.set(key, { lease, expiresAt: now + ttlMs });
        }
      }),
    releaseLease: (key, lease) =>
      Effect.sync(() => {
        if (held.get(key)?.lease === lease) held.delete(key);
      }),
  };
};

const browserLeases = (): Leases =>
  typeof navigator !== "undefined" && "locks" in navigator
    ? webLockLeases(navigator.locks)
    : memoryLeases();

/** linkshu's `KeyValueStore`: values in the `cashuKeyValue` table, leases as Web Locks. */
export const makeEvoluKeyValueStore = (
  evolu: AppEvolu,
  leases: Leases = browserLeases(),
): KeyValueStoreService => {
  const rows = Effect.promise(() =>
    evolu.loadQuery(
      evolu.createQuery((db) =>
        db
          .selectFrom("cashuKeyValue")
          .select(["id", "key", "value"])
          .where("isDeleted", "is not", sqliteTrue),
      ),
    ),
  );
  const rowOf = (key: string) =>
    Effect.map(rows, (all) =>
      all.find((row) => row.id === cashuKeyValueIdFor(key)),
    );
  return {
    get: (key) => Effect.map(rowOf(key), (row) => row?.value ?? null),
    set: (key, value) =>
      write((onComplete) =>
        evolu.upsert(
          "cashuKeyValue",
          { id: cashuKeyValueIdFor(key), key, value, isDeleted: sqliteFalse },
          { onComplete },
        ),
      ),
    remove: (key) =>
      Effect.gen(function* () {
        const row = yield* rowOf(key);
        if (row === undefined) return;
        yield* write((onComplete) =>
          evolu.update(
            "cashuKeyValue",
            { id: row.id, isDeleted: sqliteTrue },
            { onComplete },
          ),
        );
      }),
    listKeys: (prefix) =>
      Effect.map(rows, (all) =>
        all.flatMap((row) =>
          row.key !== null && row.key.startsWith(prefix) ? [row.key] : [],
        ),
      ),
    ...leases,
  };
};

/** The three linkshu storage layers for `linkshuServices`. */
export const linkshuStores = (evolu: AppEvolu) => ({
  keyValueStore: Layer.sync(KeyValueStore, () => makeEvoluKeyValueStore(evolu)),
  proofStore: Layer.sync(ProofStore, () => makeEvoluProofStore(evolu)),
  operationStore: Layer.sync(OperationStore, () =>
    makeEvoluOperationStore(evolu),
  ),
});
