import { useEffect, useState } from "react";
import { copies } from "../copy";
import type { Locale } from "../copy";

const languageParam = "lang";

/** Czech unless the URL asks for English, so a shared `?lang=en` link opens in English. */
export const localeFromUrl = (search: string): Locale =>
  new URLSearchParams(search).get(languageParam) === "en" ? "en" : "cs";

const setMetaContent = (selector: string, content: string) =>
  document.querySelector(selector)?.setAttribute("content", content);

/** The page language, mirrored to the URL, `<html lang>`, the title and the description. */
export const useLocale = () => {
  const [locale, setLocale] = useState(() => localeFromUrl(location.search));
  useEffect(() => {
    const url = new URL(location.href);
    if (locale === "cs") url.searchParams.delete(languageParam);
    else url.searchParams.set(languageParam, locale);
    history.replaceState(history.state, "", url);
    const { meta } = copies[locale];
    document.documentElement.lang = locale;
    document.title = meta.title;
    setMetaContent('meta[name="description"]', meta.description);
  }, [locale]);
  return [locale, setLocale] as const;
};
