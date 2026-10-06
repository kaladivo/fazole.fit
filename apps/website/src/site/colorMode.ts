import { themes } from "@platitprosim/ui/tokens";
import type { ColorMode } from "@platitprosim/ui/tokens";
import { useLayoutEffect, useState, useSyncExternalStore } from "react";

const darkQuery = () => matchMedia("(prefers-color-scheme: dark)");

const subscribe = (onChange: () => void) => {
  const query = darkQuery();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const systemMode = (): ColorMode => (darkQuery().matches ? "dark" : "light");

/** Follows the system until the visitor picks a mode for this visit. */
export const useColorMode = () => {
  const system = useSyncExternalStore(subscribe, systemMode);
  const [picked, setPicked] = useState<ColorMode>();
  const mode = picked ?? system;
  useLayoutEffect(() => {
    const { background } = themes[mode];
    const root = document.documentElement;
    root.style.colorScheme = mode;
    root.style.backgroundColor = background;
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute("content", background);
    }
  }, [mode]);
  const toggle = () => setPicked(mode === "dark" ? "light" : "dark");
  return [mode, toggle] as const;
};
