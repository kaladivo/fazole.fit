import { UIProvider } from "@platitprosim/ui";
import type { ReactNode } from "react";
import { copies } from "../copy";
import { useColorMode } from "./colorMode";
import { useLocale } from "./locale";
import { SiteContext } from "./site";
import type { Site } from "./site";

/** The page's language and color mode, around the UI provider. */
export function SiteProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useLocale();
  const [mode, toggleMode] = useColorMode();
  const site: Site = {
    copy: copies[locale],
    locale,
    toggleLocale: () => setLocale(locale === "cs" ? "en" : "cs"),
    mode,
    toggleMode,
  };
  return (
    <SiteContext value={site}>
      <UIProvider mode={mode}>{children}</UIProvider>
    </SiteContext>
  );
}
