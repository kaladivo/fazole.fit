import { createEvolu, SimpleName } from "@evolu/common";
import type { Evolu, EvoluConfig, EvoluDeps } from "@evolu/common";
import { createContext, useContext } from "react";
import { appConfig } from "../config";
import { AppSchema } from "./schema";

export type AppEvolu = Evolu<AppSchema>;

/** The app's Evolu instance; the web build passes `evoluWebDeps`, tests an in-memory worker. */
export const createAppEvolu = (
  deps: EvoluDeps,
  config: Partial<EvoluConfig> = {},
): AppEvolu =>
  createEvolu(deps)(AppSchema, {
    name: SimpleName.orThrow("platitprosim"),
    transports: appConfig.evoluServerUrls.map((url) => ({
      type: "WebSocket",
      url,
    })),
    ...config,
  });

export const AppEvoluContext = createContext<AppEvolu | null>(null);

/** The instance from `StorageProvider`. */
export const useAppEvolu = (): AppEvolu => {
  const evolu = useContext(AppEvoluContext);
  if (!evolu) throw new Error("useAppEvolu needs a StorageProvider");
  return evolu;
};

/**
 * Runs an Evolu mutation and resolves with the row id once the database
 * worker applied it, so a query loaded afterwards sees the write.
 */
export const mutation = <Id>(
  run: (
    onComplete: () => void,
  ) =>
    | { readonly ok: true; readonly value: { readonly id: Id } }
    | { readonly ok: false; readonly error: unknown },
): Promise<Id> =>
  new Promise((resolve, reject) => {
    const result = run(() => {
      if (result.ok) resolve(result.value.id);
    });
    if (!result.ok) {
      reject(
        new Error(`Evolu rejected the row: ${JSON.stringify(result.error)}`),
      );
    }
  });
