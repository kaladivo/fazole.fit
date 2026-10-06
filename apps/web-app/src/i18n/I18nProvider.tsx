import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { defaultLang, I18nContext, translate } from ".";
import type { Lang } from ".";

/** Holds the language in memory until settings live in Evolu. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t: translate(lang) }), [lang]);
  return <I18nContext value={value}>{children}</I18nContext>;
}
