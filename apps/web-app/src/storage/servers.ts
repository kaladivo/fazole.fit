import { Option, Schema } from "effect";
import { useMemo } from "react";
import { appConfig } from "../config";
import type { AppEvolu } from "./evolu";
import { saveSetting, settingQuery, useSetting } from "./settings";
import { watchQueries } from "./watch";

/** The relays and sync servers the shop added to the defaults. */
export type ServerKind = "nostrRelays" | "evoluServers";

const decodeUrls = (value: string | null | undefined): readonly string[] =>
  Option.getOrElse(
    Schema.decodeUnknownOption(Schema.parseJson(Schema.Array(Schema.String)))(
      value,
    ),
    () => [],
  );

export const loadOwnServers = async (evolu: AppEvolu, kind: ServerKind) =>
  decodeUrls((await evolu.loadQuery(settingQuery(evolu, kind)))[0]?.value);

export const useOwnServers = (kind: ServerKind): readonly string[] => {
  const value = useSetting(kind);
  return useMemo(() => decodeUrls(value), [value]);
};

export const saveOwnServers = (
  evolu: AppEvolu,
  kind: ServerKind,
  urls: readonly string[],
) => saveSetting(evolu, kind, JSON.stringify(urls));

const webSocket = (url: string) => ({ type: "WebSocket" as const, url });

/**
 * Syncs the app owner with the shop's own Evolu servers next to the defaults,
 * following the setting as it changes.
 */
export const syncOwnEvoluServers = (evolu: AppEvolu): (() => void) => {
  const query = settingQuery(evolu, "evoluServers");
  let unuse = () => {};
  const stopWatching = watchQueries(evolu, [query], () => {
    const own = decodeUrls(evolu.getQueryRows(query)[0]?.value);
    void evolu.appOwner.then((appOwner) => {
      // Evolu sends writes to the transports of the owner used last, so the new set goes in before the old one leaves.
      const previous = unuse;
      unuse =
        own.length === 0
          ? () => {}
          : evolu.useOwner({
              ...appOwner,
              transports: [...appConfig.evoluServerUrls, ...own].map(webSocket),
            });
      previous();
    });
  });
  return () => {
    stopWatching();
    unuse();
  };
};
