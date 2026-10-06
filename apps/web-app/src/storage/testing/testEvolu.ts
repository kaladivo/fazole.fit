import {
  createConsole,
  createRandom,
  createRandomBytes,
  createTime,
  createWebSocket,
  SimpleName,
} from "@evolu/common";
import type { CreateSqliteDriver, SqliteRow } from "@evolu/common";
import { createDbWorkerForPlatform } from "@evolu/common/local-first";
import { DatabaseSync } from "node:sqlite";
import type { SQLOutputValue } from "node:sqlite";
import { createAppEvolu } from "../evolu";
import type { AppEvolu } from "../evolu";

const toSqliteRow = (row: Record<string, SQLOutputValue>): SqliteRow =>
  Object.fromEntries(
    Object.entries(row).map(([column, value]) => [
      column,
      typeof value === "bigint" ? Number(value) : value,
    ]),
  );

/** Evolu's SQLite driver over Node's built-in in-memory SQLite. */
const createNodeSqliteDriver: CreateSqliteDriver = async () => {
  const db = new DatabaseSync(":memory:");
  return {
    exec: (query, isMutation) => {
      if (isMutation && query.parameters.length === 0) {
        db.exec(query.sql);
        return { rows: [], changes: 0 };
      }
      const statement = db.prepare(query.sql);
      if (isMutation) {
        const { changes } = statement.run(...query.parameters);
        return { rows: [], changes: Number(changes) };
      }
      return {
        rows: statement.all(...query.parameters).map(toSqliteRow),
        changes: 0,
      };
    },
    export: () => new Uint8Array(),
    [Symbol.dispose]: () => db.close(),
  };
};

let instances = 0;

/** A fresh, local-only Evolu in the test process, with the real database worker. */
export const createTestEvolu = (): AppEvolu => {
  const randomBytes = createRandomBytes();
  const time = createTime();
  return createAppEvolu(
    {
      console: createConsole(),
      randomBytes,
      time,
      reloadApp: () => {},
      createDbWorker: () =>
        createDbWorkerForPlatform({
          console: createConsole(),
          createSqliteDriver: createNodeSqliteDriver,
          createWebSocket,
          random: createRandom(),
          randomBytes,
          time,
        }),
    },
    {
      name: SimpleName.orThrow(`test${(instances += 1)}`),
      transports: [],
    },
  );
};
