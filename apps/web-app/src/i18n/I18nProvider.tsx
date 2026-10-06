import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { detectLang, I18nContext, isLang, translate } from ".";
import type { Lang } from ".";
import { saveSetting, useAppEvolu, useSetting } from "../storage";

/** The language saved in Evolu settings; until one is chosen, the browser's. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const evolu = useAppEvolu();
  const stored = useSetting("language");
  const lang = isLang(stored) ? stored : detectLang(navigator.languages);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo(
    () => ({
      lang,
      setLang: (next: Lang) => void saveSetting(evolu, "language", next),
      t: translate(lang),
    }),
    [evolu, lang],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}
