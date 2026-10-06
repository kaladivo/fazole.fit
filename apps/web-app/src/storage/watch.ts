import type { Query } from "@evolu/common";
import type { AppEvolu } from "./evolu";

/** Calls `onChange` once the queries loaded and again whenever their rows change, also by sync. */
export const watchQueries = (
  evolu: AppEvolu,
  queries: readonly Query[],
  onChange: () => void,
): (() => void) => {
  const unsubscribes = queries.map((query) =>
    evolu.subscribeQuery(query)(onChange),
  );
  void Promise.all(queries.map((query) => evolu.loadQuery(query))).then(
    onChange,
  );
  return () => {
    for (const unsubscribe of unsubscribes) unsubscribe();
  };
};
