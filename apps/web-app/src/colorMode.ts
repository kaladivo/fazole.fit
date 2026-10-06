import type { ColorMode } from "@platitprosim/ui/tokens";
import { useSyncExternalStore } from "react";

const darkQuery = () => matchMedia("(prefers-color-scheme: dark)");

const subscribe = (onChange: () => void) => {
  const query = darkQuery();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** Follows the system color scheme. */
export const useColorMode = (): ColorMode =>
  useSyncExternalStore(subscribe, () =>
    darkQuery().matches ? "dark" : "light",
  );
