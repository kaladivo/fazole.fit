import type { RelayHealthSnapshot } from "@linky-fit/linkstr";
import { useEffect, useState } from "react";
import type { Nostr } from "./nostr";

export type ServerState = "connecting" | "connected" | "unreachable";

export interface ServerStatus {
  readonly state: ServerState;
  /** Why the server is unreachable, when it said. */
  readonly detail: string | null;
}

export type ServerStatuses = ReadonlyMap<string, ServerStatus>;

/** linkstr's health of each relay, folded from the app's own traffic. */
export const useRelayStatuses = (nostr: Nostr): ServerStatuses => {
  const [health, setHealth] = useState<RelayHealthSnapshot>(new Map());
  useEffect(() => nostr.watchRelayHealth(setHealth), [nostr]);
  return health;
};

const PROBE_INTERVAL_MS = 15_000;
const PROBE_TIMEOUT_MS = 3_500;

const canConnect = (url: string) =>
  new Promise<boolean>((resolve) => {
    const socket = new WebSocket(url);
    const finish = (connected: boolean) => {
      clearTimeout(timeout);
      socket.close();
      resolve(connected);
    };
    const timeout = setTimeout(() => finish(false), PROBE_TIMEOUT_MS);
    socket.addEventListener("open", () => finish(true));
    socket.addEventListener("error", () => finish(false));
  });

/** Whether each WebSocket server accepts a connection, checked while mounted. */
export const useWebSocketStatuses = (
  urls: readonly string[],
): ServerStatuses => {
  const [statuses, setStatuses] = useState<ServerStatuses>(new Map());
  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      const results = await Promise.all(
        urls.map(async (url) => [url, await canConnect(url)] as const),
      );
      if (cancelled) return;
      setStatuses(
        new Map(
          results.map(([url, connected]) => [
            url,
            { state: connected ? "connected" : "unreachable", detail: null },
          ]),
        ),
      );
    };
    void probe();
    const interval = setInterval(() => void probe(), PROBE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [urls]);
  return statuses;
};
