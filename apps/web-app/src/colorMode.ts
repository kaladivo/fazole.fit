import type { ColorMode } from "@platitprosim/ui/tokens";
import { useSyncExternalStore } from "react";
import { useSetting } from "./storage";

export const themes = ["system", "light", "dark"] as const;
export type ThemeSetting = (typeof themes)[number];

export const isThemeSetting = (value: unknown): value is ThemeSetting =>
  themes.some((theme) => theme === value);

const darkQuery = () => matchMedia("(prefers-color-scheme: dark)");

const subscribe = (onChange: () => void) => {
  const query = darkQuery();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const useSystemColorMode = (): ColorMode =>
  useSyncExternalStore(subscribe, () =>
    darkQuery().matches ? "dark" : "light",
  );

export const useThemeSetting = (): ThemeSetting => {
  const stored = useSetting("theme");
  return isThemeSetting(stored) ? stored : "system";
};

/** The theme from Evolu settings, following the system unless one is chosen. */
export const useColorMode = (): ColorMode => {
  const system = useSystemColorMode();
  const theme = useThemeSetting();
  return theme === "system" ? system : theme;
};
