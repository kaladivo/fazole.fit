import { Option, Schema } from "effect";

/** Decodes each row and keeps its id; rows that have not fully synced yet, or do not validate, are left out. */
export const decodeRows =
  <A, Id>(decode: (row: unknown) => Option.Option<A>) =>
  (rows: ReadonlyArray<{ readonly id: Id } & Record<string, unknown>>) =>
    rows.flatMap((row) =>
      Option.toArray(
        Option.map(decode(row), (fields) => ({ ...fields, id: row.id })),
      ),
    );

/**
 * A row's last change as Unix millis, read from a `changedAt` column a query
 * selects as `coalesce(updatedAt, createdAt)`: Evolu sets `updatedAt` from
 * the first update on.
 */
export const RowChangedAtMs = Schema.propertySignature(
  Schema.transform(Schema.String, Schema.Int, {
    strict: true,
    decode: (iso) => Date.parse(iso),
    encode: (ms) => new Date(ms).toISOString(),
  }),
).pipe(Schema.fromKey("changedAt"));
