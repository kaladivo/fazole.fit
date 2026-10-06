import { sqliteTrue } from "@evolu/common";
import {
  InboxCursorStore,
  OutboxStore,
  PersistedOutboxJob,
  StoredOutboxJob,
  UnixSeconds,
} from "@linky-fit/linkstr";
import type {
  InboxCursorStoreService,
  OutboxStoreService,
  Pubkey,
} from "@linky-fit/linkstr";
import { Effect, Layer, Option, Schema } from "effect";
import type { AppEvolu } from "./evolu";
import { mutation } from "./evolu";
import { inboxCursorIdFor, outboxJobIdFor } from "./schema";

const write = (run: Parameters<typeof mutation>[0]) =>
  Effect.promise(() => mutation(run));

const encodeJob = (job: StoredOutboxJob) =>
  JSON.stringify(Schema.encodeSync(StoredOutboxJob)(job));
const decodeJob = Schema.decodeUnknownOption(
  Schema.parseJson(PersistedOutboxJob),
);

/** linkstr's `OutboxStore` on the `outboxJob` table, in insertion order. */
export const makeEvoluOutboxStore = (evolu: AppEvolu): OutboxStoreService => {
  const rows = Effect.promise(() =>
    evolu.loadQuery(
      evolu.createQuery((db) =>
        db
          .selectFrom("outboxJob")
          .select(["id", "job", "position"])
          .where("isDeleted", "is not", sqliteTrue)
          .orderBy("position"),
      ),
    ),
  );
  const rowOf = (jobId: string) =>
    Effect.map(rows, (all) =>
      all.find((row) => row.id === outboxJobIdFor(jobId)),
    );
  return {
    insert: (job) =>
      Effect.gen(function* () {
        const last = (yield* rows).at(-1)?.position ?? 0;
        yield* write((onComplete) =>
          evolu.upsert(
            "outboxJob",
            {
              id: outboxJobIdFor(job.jobId),
              jobId: job.jobId,
              job: encodeJob(job),
              position: last + 1,
            },
            { onComplete },
          ),
        );
      }),
    update: (job) =>
      Effect.gen(function* () {
        const row = yield* rowOf(job.jobId);
        if (row === undefined) return;
        yield* write((onComplete) =>
          evolu.update(
            "outboxJob",
            { id: row.id, job: encodeJob(job) },
            { onComplete },
          ),
        );
      }),
    remove: (jobId) =>
      Effect.gen(function* () {
        const row = yield* rowOf(jobId);
        if (row === undefined) return;
        yield* write((onComplete) =>
          evolu.update(
            "outboxJob",
            { id: row.id, isDeleted: sqliteTrue },
            { onComplete },
          ),
        );
      }),
    loadAll: Effect.map(rows, (all) =>
      all.flatMap((row) => Option.toArray(decodeJob(row.job))),
    ),
  };
};

/**
 * Every cursor write is synced into the never-rotated app owner's relay quota,
 * so the stored cursor only moves once it is this far behind; a reload then
 * re-reads at most this much of the inbox, which dedupes it.
 */
export const INBOX_CURSOR_MIN_ADVANCE_SEC = 60 * 60;

const decodeCursor = Schema.decodeUnknownOption(UnixSeconds);

/** linkstr's `InboxCursorStore` for one identity on the `inboxCursor` table. */
export const makeEvoluInboxCursorStore = (
  evolu: AppEvolu,
  pubkey: Pubkey,
): InboxCursorStoreService => {
  const id = inboxCursorIdFor(pubkey);
  let latest: UnixSeconds | null = null;
  const stored = Effect.map(
    Effect.promise(() =>
      evolu.loadQuery(
        evolu.createQuery((db) =>
          db
            .selectFrom("inboxCursor")
            .select("cursorSec")
            .where("id", "=", id)
            .where("isDeleted", "is not", sqliteTrue),
        ),
      ),
    ),
    (rows) => Option.getOrNull(decodeCursor(rows[0]?.cursorSec)),
  );
  return {
    load: Effect.map(stored, (cursor) =>
      latest !== null && (cursor === null || latest > cursor) ? latest : cursor,
    ),
    save: (cursor) =>
      Effect.gen(function* () {
        latest = cursor;
        const current = yield* stored;
        if (
          current !== null &&
          cursor < current + INBOX_CURSOR_MIN_ADVANCE_SEC
        ) {
          return;
        }
        yield* write((onComplete) =>
          evolu.upsert(
            "inboxCursor",
            { id, pubkey, cursorSec: cursor },
            { onComplete },
          ),
        );
      }),
  };
};

/** The two linkstr storage layers for `linkstrServices`. */
export const linkstrStores = (evolu: AppEvolu, pubkey: Pubkey) => ({
  outboxStore: Layer.sync(OutboxStore, () => makeEvoluOutboxStore(evolu)),
  inboxCursorStore: Layer.sync(InboxCursorStore, () =>
    makeEvoluInboxCursorStore(evolu, pubkey),
  ),
});
