import type { ColorMode } from "@platitprosim/ui";
import { createContext, useContext } from "react";
import { copies } from "../copy";
import type { Locale, SiteCopy } from "../copy";

export interface Site {
  copy: SiteCopy;
  locale: Locale;
  toggleLocale: () => void;
  mode: ColorMode;
  toggleMode: () => void;
}

export const SiteContext = createContext<Site>({
  copy: copies.cs,
  locale: "cs",
  toggleLocale: () => {},
  mode: "light",
  toggleMode: () => {},
});

export const useSite = () => useContext(SiteContext);
