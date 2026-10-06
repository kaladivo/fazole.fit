import { fetchFiatRates, isFiatRatesStale } from "@linky-fit/linkshu";
import type { FiatRates } from "@linky-fit/linkshu";
import { useCallback, useEffect, useState } from "react";

const FETCH_TIMEOUT_MS = 8_000;

/** The rate lives in memory only; app data stays in Evolu and a rate is not worth syncing. */
let latest: FiatRates | null = null;
let inflight: Promise<number | null> | null = null;

const fetchCzkPerBtc = async (): Promise<number | null> => {
  try {
    const rates = await fetchFiatRates(AbortSignal.timeout(FETCH_TIMEOUT_MS));
    if (rates !== null) latest = rates;
  } catch (error) {
    console.warn("fiat rates unavailable", error);
  }
  return isFiatRatesStale(latest) ? null : (latest?.czkPerBtc ?? null);
};

/** CZK per BTC, at most 10 minutes old; `null` while the rate service cannot be reached. */
export const loadCzkPerBtc = (): Promise<number | null> => {
  if (latest !== null && !isFiatRatesStale(latest)) {
    return Promise.resolve(latest.czkPerBtc);
  }
  inflight ??= fetchCzkPerBtc().finally(() => {
    inflight = null;
  });
  return inflight;
};

export type CzkRate =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly czkPerBtc: number }
  | { readonly status: "failed"; readonly retry: () => void };

export const useCzkRate = (): CzkRate => {
  const [attempt, setAttempt] = useState(0);
  const [rate, setRate] = useState<number | null | undefined>(undefined);
  const retry = useCallback(() => {
    setRate(undefined);
    setAttempt((current) => current + 1);
  }, []);
  useEffect(() => {
    let current = true;
    void loadCzkPerBtc().then((czkPerBtc) => {
      if (current) setRate(czkPerBtc);
    });
    return () => {
      current = false;
    };
  }, [attempt]);
  if (rate === undefined) return { status: "loading" };
  return rate === null
    ? { status: "failed", retry }
    : { status: "ready", czkPerBtc: rate };
};
