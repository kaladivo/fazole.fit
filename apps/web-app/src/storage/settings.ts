import { sqliteTrue } from "@evolu/common";
import { useQuery } from "@evolu/react";
import type { AppEvolu } from "./evolu";
import { mutation, useAppEvolu } from "./evolu";
import { settingIdFor } from "./schema";

export type SettingKey = "language" | "theme" | "nostrRelays" | "evoluServers";

export const settingQuery = (evolu: AppEvolu, key: SettingKey) =>
  evolu.createQuery((db) =>
    db
      .selectFrom("setting")
      .select("value")
      .where("id", "=", settingIdFor(key))
      .where("isDeleted", "is not", sqliteTrue),
  );

/** The stored value, `null` until one is saved. */
export const useSetting = (key: SettingKey): string | null =>
  useQuery(settingQuery(useAppEvolu(), key))[0]?.value ?? null;

export const saveSetting = (evolu: AppEvolu, key: SettingKey, value: string) =>
  mutation((onComplete) =>
    evolu.upsert(
      "setting",
      { id: settingIdFor(key), key, value },
      { onComplete },
    ),
  );
